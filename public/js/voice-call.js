/**
 * Module de gestion des appels vocaux WebRTC
 * Gère les connexions peer-to-peer, la signalisation et l'interface d'appel
 */
(function () {
  'use strict';

  // Configuration WebRTC
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  const RTC_CONFIG = {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10
  };

  // États de l'appel
  const CALL_STATES = {
    IDLE: 'idle',
    INITIATING: 'initiating',
    RINGING: 'ringing',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ENDED: 'ended'
  };

  class VoiceCallManager {
    constructor() {
      this.socket = null;
      this.peerConnection = null;
      this.localStream = null;
      this.remoteStream = null;
      this.currentCall = null;
      this.callState = CALL_STATES.IDLE;
      this.isInitiator = false;
      this.conversationId = null;
      this.remoteUserId = null;
      this.remoteUsername = null;
      this.callStartTime = null;
      this.durationInterval = null;
      this.ringtoneAudio = null;
      this.notificationAudio = null;
      this._pendingOffer = null;
      this._pendingIncomingOffer = null; // Stocker l'offre entrante jusqu'à answerCall
      this._audioContext = null;
      this._oscillator = null;
      this._ringtoneInterval = null;

      // Callbacks
      this.onStateChange = null;
      this.onError = null;
      this.onCallEnded = null;
    }

    /**
     * Initialiser le gestionnaire d'appels
     */
    init(socket) {
      console.log('[VoiceCall] Initialisation du VoiceCallManager avec socket:', !!socket);
      this.socket = socket;
      this.setupSocketListeners();
      this.loadAudioAssets();
    }

    /**
     * Charger les sons de notification
     */
    loadAudioAssets() {
      // Créer des éléments audio pour les sons
      this.ringtoneAudio = new Audio();
      this.ringtoneAudio.loop = true;
      this.ringtoneAudio.volume = 0.5;

      this.notificationAudio = new Audio();
      this.notificationAudio.volume = 0.7;
    }

    /**
     * Configurer les écouteurs Socket.IO
     */
    setupSocketListeners() {
      if (!this.socket) {
        console.warn('[VoiceCall] Socket non disponible pour configurer les listeners');
        return;
      }

      console.log('[VoiceCall] Configuration des listeners Socket.IO');

      // Appel entrant
      this.socket.on('call:incoming', (data) => {
        console.log('[VoiceCall] Événement call:incoming reçu', data);
        this.handleIncomingCall(data);
      });

      // Offre WebRTC reçue
      this.socket.on('call:offer', async (data) => {
        console.log('[VoiceCall] Événement call:offer reçu', data);
        await this.handleOffer(data);
      });

      // Réponse WebRTC reçue
      this.socket.on('call:answer', async (data) => {
        console.log('[VoiceCall] Événement call:answer reçu', data);
        await this.handleAnswer(data);
      });

      // Candidat ICE reçu
      this.socket.on('call:ice-candidate', async (data) => {
        await this.handleIceCandidate(data);
      });

      // Appel terminé
      this.socket.on('call:ended', (data) => {
        console.log('[VoiceCall] Événement call:ended reçu', data);
        this.handleCallEnded(data);
      });

      // Appel rejeté
      this.socket.on('call:rejected', (data) => {
        console.log('[VoiceCall] Événement call:rejected reçu', data);
        this.handleCallRejected(data);
      });

      // Appel annulé
      this.socket.on('call:cancelled', (data) => {
        console.log('[VoiceCall] Événement call:cancelled reçu', data);
        this.handleCallCancelled(data);
      });
    }

    /**
     * Initier un appel sortant
     */
    async initiateCall(conversationId, remoteUserId, remoteUsername) {
      console.log('[VoiceCall] initiateCall appelé', {
        conversationId,
        remoteUserId,
        remoteUsername
      });

      // NOTE: On attend maintenant l'événement call:incoming pour obtenir callId avant d'envoyer l'offre.
      // L'offre est stockée temporairement dans this._pendingOffer.
      try {
        this.conversationId = conversationId;
        this.remoteUserId = remoteUserId;
        this.remoteUsername = remoteUsername;
        this.isInitiator = true;
        this.updateCallState(CALL_STATES.INITIATING);

        // Vérifier la connexion socket AVANT de demander le micro pour éviter une permission inutile
        if (!this.socket || !this.socket.connected) {
          console.warn('[VoiceCall] Abandon: socket non connecté avant init appel');
          this.handleError('Connexion socket indisponible. Réessayez.');
          this.updateCallState(CALL_STATES.IDLE);
          return;
        }

        console.log("[VoiceCall] Demande d'accès au microphone...");
        // Demander l'accès au microphone
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });

        console.log('[VoiceCall] Microphone obtenu, création de la connexion peer');
        // Créer la connexion peer
        this.createPeerConnection();

        // Ajouter les pistes audio locales
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        // Émettre l'événement d'initialisation
        console.log('[VoiceCall] État du socket avant émission:', {
          connected: this.socket?.connected,
          id: this.socket?.id
        });

        if (!this.socket || !this.socket.connected) {
          // Cas rare: déconnexion entre getUserMedia et émission
          console.error('[VoiceCall] Socket déconnecté après acquisition micro');
          this.handleError('Socket déconnecté.');
          this.endCall('network');
          return;
        }

        console.log("[VoiceCall] Émission de l'événement call:initiate", {
          conversationId,
          type: 'audio'
        });
        this.socket.emit('call:initiate', {
          conversationId,
          type: 'audio'
        });

        console.log("[VoiceCall] Création de l'offre WebRTC...");
        // Créer l'offre WebRTC mais NE PAS l'envoyer tant que callId n'est pas reçu.
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this._pendingOffer = offer; // sera envoyée dans handleIncomingCall pour l'initiateur

        console.log('[VoiceCall] Offre créée et mise en attente');
        this.updateCallState(CALL_STATES.RINGING);
        this.playRingtone();
      } catch (error) {
        console.error("Erreur lors de l'initiation de l'appel:", error);
        const msg =
          error?.name === 'NotAllowedError'
            ? 'Permission microphone refusée.'
            : error?.message === 'Socket non connecté'
              ? 'Connexion socket indisponible. Réessayez.'
              : "Erreur lors de l'initialisation de l'appel.";
        this.handleError(msg);
        this.endCall('error');
      }
    }

    /**
     * Gérer un appel entrant
     */
    handleIncomingCall(data) {
      console.log('[VoiceCall] handleIncomingCall - État actuel:', {
        isInitiator: this.isInitiator,
        hasPendingOffer: !!this._pendingOffer,
        hasCurrentCall: !!this.currentCall,
        callState: this.callState
      });

      const wasInitiatorWaitingOffer = this.isInitiator && this._pendingOffer && !this.currentCall;
      this.currentCall = data;
      this.conversationId = data.conversationId;

      if (wasInitiatorWaitingOffer) {
        // L'initiateur reçoit aussi call:incoming, nous pouvons maintenant envoyer l'offre
        console.log('[VoiceCall] Initiateur envoie offre avec callId:', data.callId);
        this.socket.emit('call:offer', {
          callId: data.callId,
          conversationId: data.conversationId,
          offer: this.peerConnection?.localDescription
        });
        this._pendingOffer = null; // Nettoyage après envoi
      } else {
        // Côté destinataire (non initiateur) => rejoindre room + sonnerie
        console.log('[VoiceCall] Destinataire reçoit appel entrant, callId:', data.callId);
        this.isInitiator = false;
        this.remoteUserId = data.initiatorId;

        // Rejoindre la room conversation pour recevoir les événements WebRTC
        this.socket.emit('conversation:join', {
          conversationId: data.conversationId,
          markAsRead: false
        });
        console.log('[VoiceCall] Destinataire rejoint conversation room:', data.conversationId);

        this.updateCallState(CALL_STATES.RINGING);
        this.playRingtone();
      }

      // Notifier l'interface
      if (this.onStateChange) {
        this.onStateChange({
          state: CALL_STATES.RINGING,
          isIncoming: !this.isInitiator,
          callId: data.callId,
          conversationId: data.conversationId,
          initiatorId: data.initiatorId
        });
      }
    }

    /**
     * Répondre à un appel entrant
     */
    async answerCall() {
      console.log('[VoiceCall] answerCall appelé, arrêt sonnerie...');
      try {
        this.stopRingtone();
        console.log('[VoiceCall] Sonnerie arrêtée, changement état vers CONNECTING');
        this.updateCallState(CALL_STATES.CONNECTING);

        // Demander l'accès au microphone
        console.log('[VoiceCall] Demande accès microphone pour répondre...');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });

        console.log('[VoiceCall] Microphone obtenu, création peerConnection...');
        // Créer la connexion peer
        this.createPeerConnection();

        // Ajouter les pistes audio locales
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
        console.log('[VoiceCall] Pistes audio ajoutées');

        // Si une offre était en attente, la traiter maintenant
        if (this._pendingIncomingOffer) {
          console.log('[VoiceCall] Traitement offre en attente...');
          await this.processIncomingOffer(this._pendingIncomingOffer);
          this._pendingIncomingOffer = null;
        }
      } catch (error) {
        console.error("Erreur lors de la réponse à l'appel:", error);
        this.handleError("Impossible d'accéder au microphone");
        this.rejectCall();
      }
    }

    /**
     * Traiter une offre WebRTC entrante
     */
    async processIncomingOffer(data) {
      try {
        console.log('[VoiceCall] processIncomingOffer - setRemoteDescription');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        console.log('[VoiceCall] Création de la réponse WebRTC...');
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Attendre les candidats ICE
        await this.waitForIceCandidates();

        console.log('[VoiceCall] Envoi de la réponse au serveur');
        this.socket.emit('call:answer', {
          callId: this.currentCall.callId,
          conversationId: this.conversationId,
          answer: this.peerConnection.localDescription
        });
      } catch (error) {
        console.error("[VoiceCall] Erreur lors du traitement de l'offre:", error);
        this.handleError('Erreur de connexion');
        this.endCall('error');
      }
    }

    /**
     * Gérer l'offre WebRTC
     */
    async handleOffer(data) {
      console.log('[VoiceCall] handleOffer reçu, peerConnection existe:', !!this.peerConnection);

      try {
        // Si pas de peerConnection, c'est que l'utilisateur n'a pas encore répondu
        // Stocker l'offre et attendre answerCall()
        if (!this.peerConnection) {
          console.log('[VoiceCall] Offre mise en attente, en attente de answerCall()');
          this._pendingIncomingOffer = data;
          return;
        }

        // Si peerConnection existe, traiter l'offre immédiatement
        await this.processIncomingOffer(data);
      } catch (error) {
        console.error("Erreur lors de la gestion de l'offre:", error);
        this.handleError('Erreur de connexion');
        this.endCall('error');
      }
    }

    /**
     * Gérer la réponse WebRTC
     */
    async handleAnswer(data) {
      try {
        this.stopRingtone();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        this.updateCallState(CALL_STATES.CONNECTING);
      } catch (error) {
        console.error('Erreur lors du traitement de la réponse:', error);
        this.handleError('Erreur de connexion');
        this.endCall('error');
      }
    }

    /**
     * Gérer les candidats ICE
     */
    async handleIceCandidate(data) {
      try {
        if (!this.peerConnection || !data.candidate) {
          return;
        }

        // Attendre que remoteDescription soit définie avant d'ajouter les candidats ICE
        if (!this.peerConnection.remoteDescription) {
          console.warn('[VoiceCall] Candidat ICE reçu avant remoteDescription, en attente...');
          return;
        }

        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error("Erreur lors de l'ajout du candidat ICE:", error);
      }
    }

    /**
     * Créer une connexion peer WebRTC
     */
    createPeerConnection() {
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Gérer les candidats ICE
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('call:ice-candidate', {
            callId: this.currentCall?.callId,
            conversationId: this.conversationId,
            candidate: event.candidate
          });
        }
      };

      // Gérer le flux distant
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onStateChange) {
          this.onStateChange({
            state: this.callState,
            remoteStream: this.remoteStream
          });
        }
      };

      // Gérer les changements de connexion
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('État de connexion WebRTC:', state);

        if (state === 'connected') {
          this.updateCallState(CALL_STATES.CONNECTED);
          this.startCallTimer();
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          this.endCall(state === 'failed' ? 'network' : 'completed');
        }
      };
    }

    /**
     * Attendre que les candidats ICE soient collectés
     */
    waitForIceCandidates() {
      return new Promise((resolve) => {
        if (!this.peerConnection) {
          console.warn('[VoiceCall] peerConnection null dans waitForIceCandidates');
          resolve();
          return;
        }

        if (this.peerConnection.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (this.peerConnection && this.peerConnection.iceGatheringState === 'complete') {
              this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          this.peerConnection.addEventListener('icegatheringstatechange', checkState);

          // Timeout après 3 secondes
          setTimeout(() => {
            if (this.peerConnection) {
              this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            }
            resolve();
          }, 3000);
        }
      });
    }

    /**
     * Rejeter un appel entrant
     */
    rejectCall() {
      this.stopRingtone();

      if (this.currentCall) {
        this.socket.emit('call:reject', {
          callId: this.currentCall.callId,
          conversationId: this.conversationId
        });
      }

      this.cleanup();
    }

    /**
     * Terminer un appel en cours
     */
    endCall(reason = 'completed') {
      this.stopRingtone();
      this.stopCallTimer();

      if (this.currentCall) {
        this.socket.emit('call:end', {
          callId: this.currentCall.callId,
          conversationId: this.conversationId,
          reason
        });
      }

      this.cleanup();
    }

    /**
     * Annuler un appel sortant
     */
    cancelCall() {
      this.stopRingtone();

      if (this.currentCall) {
        this.socket.emit('call:cancel', {
          callId: this.currentCall.callId,
          conversationId: this.conversationId
        });
      }

      this.cleanup();
    }

    /**
     * Gérer la fin d'appel
     */
    handleCallEnded(data) {
      this.stopRingtone();
      this.stopCallTimer();
      this.cleanup();

      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
    }

    /**
     * Gérer le rejet d'appel
     */
    handleCallRejected(data) {
      this.stopRingtone();
      this.cleanup();

      if (this.onCallEnded) {
        this.onCallEnded({ ...data, reason: 'rejected' });
      }
    }

    /**
     * Gérer l'annulation d'appel
     */
    handleCallCancelled(data) {
      this.stopRingtone();
      this.cleanup();

      if (this.onCallEnded) {
        this.onCallEnded({ ...data, reason: 'cancelled' });
      }
    }

    /**
     * Mettre en sourdine le microphone
     */
    toggleMute() {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          return !audioTrack.enabled; // retourne true si en sourdine
        }
      }
      return false;
    }

    /**
     * Vérifier si le micro est en sourdine
     */
    isMuted() {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        return audioTrack ? !audioTrack.enabled : false;
      }
      return false;
    }

    /**
     * Démarrer le chronomètre d'appel
     */
    startCallTimer() {
      this.callStartTime = Date.now();
      this.durationInterval = setInterval(() => {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        if (this.onStateChange) {
          this.onStateChange({
            state: this.callState,
            duration
          });
        }
      }, 1000);
    }

    /**
     * Arrêter le chronomètre
     */
    stopCallTimer() {
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }
      this.callStartTime = null;
    }

    /**
     * Jouer la sonnerie
     */
    playRingtone() {
      // Arrêter toute sonnerie existante d'abord
      this.stopRingtone();

      console.log('[VoiceCall] playRingtone démarrage...');

      try {
        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Reprendre le contexte si suspendu (autoplay policy)
        if (this._audioContext.state === 'suspended') {
          this._audioContext.resume().catch((e) => {
            console.warn('[VoiceCall] Impossible de reprendre AudioContext:', e);
          });
        }

        const playBeep = () => {
          if (!this._audioContext || this._audioContext.state === 'closed') {
            console.warn('[VoiceCall] AudioContext fermé, arrêt beep');
            return;
          }

          const oscillator = this._audioContext.createOscillator();
          const gainNode = this._audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(this._audioContext.destination);

          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.1;
          oscillator.type = 'sine';

          oscillator.start();
          setTimeout(() => {
            try {
              oscillator.stop();
              oscillator.disconnect();
            } catch (e) {
              // Ignore si déjà arrêté
            }
          }, 800);
        };

        // Premier beep
        playBeep();

        // Répéter toutes les 2 secondes
        this._ringtoneInterval = setInterval(() => {
          playBeep();
        }, 2000);

        console.log('[VoiceCall] Sonnerie démarrée');
      } catch (error) {
        console.warn('[VoiceCall] Erreur lors de la lecture de la sonnerie:', error);
      }
    }

    /**
     * Arrêter la sonnerie
     */
    stopRingtone() {
      console.log('[VoiceCall] stopRingtone appelé, nettoyage...', {
        hasInterval: !!this._ringtoneInterval,
        hasContext: !!this._audioContext
      });

      if (this._ringtoneInterval) {
        clearInterval(this._ringtoneInterval);
        this._ringtoneInterval = null;
        console.log('[VoiceCall] Interval sonnerie nettoyé');
      }

      if (this._audioContext) {
        try {
          this._audioContext.close();
          console.log('[VoiceCall] AudioContext fermé');
        } catch (e) {
          console.warn('[VoiceCall] Erreur fermeture AudioContext:', e);
        }
        this._audioContext = null;
      }

      if (this.ringtoneAudio) {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
      }

      console.log('[VoiceCall] stopRingtone terminé');
    }

    /**
     * Nettoyer les ressources
     */
    cleanup() {
      // Arrêter les flux
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((track) => track.stop());
        this.remoteStream = null;
      }

      // Fermer la connexion peer
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Réinitialiser l'état
      this.currentCall = null;
      this.callState = CALL_STATES.IDLE;
      this.isInitiator = false;
      this.conversationId = null;
      this.remoteUserId = null;
      this.remoteUsername = null;

      if (this.onStateChange) {
        this.onStateChange({ state: CALL_STATES.IDLE });
      }
    }

    /**
     * Mettre à jour l'état de l'appel
     */
    updateCallState(newState) {
      this.callState = newState;
      if (this.onStateChange) {
        this.onStateChange({ state: newState });
      }
    }

    /**
     * Gérer une erreur
     */
    handleError(message) {
      console.error("Erreur d'appel:", message);
      if (this.onError) {
        this.onError(message);
      }
    }

    /**
     * Obtenir l'état actuel de l'appel
     */
    getCallState() {
      return this.callState;
    }

    /**
     * Vérifier si un appel est en cours
     */
    isInCall() {
      return this.callState !== CALL_STATES.IDLE && this.callState !== CALL_STATES.ENDED;
    }
  }

  // Exporter le gestionnaire
  window.VoiceCallManager = VoiceCallManager;
  window.CALL_STATES = CALL_STATES;
})();
