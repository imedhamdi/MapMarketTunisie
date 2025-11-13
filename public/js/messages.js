(function () {
  'use strict';

  const isMessagesDebugEnabled = Boolean(window?.__MESSAGES_DEBUG__);
  const messagesDebugLog = (..._args) => {
    if (!isMessagesDebugEnabled) return;
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log(..._args);
    }
  };
  const messagesDebugWarn = (..._args) => {
    if (!isMessagesDebugEnabled) return;
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(..._args);
    }
  };

  const SOCKET_PATH = '/ws/chat';
  const API_BASE = window.__API_BASE__ || `${window.location.origin}/api/v1`;
  const CONVERSATION_LIMIT = 60;
  const MESSAGE_LIMIT = 80;
  const OLDER_MESSAGES_LIMIT = 50;
  const MAX_ATTACHMENTS = 5;
  const MAX_VOICE_DURATION = 120;
  const VOICE_MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4'
  ];
  const LAYOUT_BREAKPOINT = 960;
  const ATTACHMENT_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2399A4B5' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10'/%3E%3Crect x='3' y='13' width='18' height='8' rx='2'/%3E%3Ccircle cx='12' cy='17' r='1.5'/%3E%3C/svg%3E";
  const AD_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/640x480?text=Annonce';
  const AD_IMAGE_ARRAY_KEYS = [
    'gallery',
    'images',
    'photos',
    'thumbnails',
    'previews',
    'pictures',
    'media'
  ];

  let socket = null;
  let activeConversationId = null;
  let readFlushTimer = null;
  let typingTimer = null;
  let pendingSelectConversationId = null;
  let composerAttachments = [];
  let compactLayoutQuery = null;
  let typingIndicatorHideTimer = null;
  let loadingOlderMessages = false;
  let unreadCountRequest = null;

  const pendingRead = new Set();
  const pendingMessages = new Map();
  const pendingAudioUrls = new Map();
  const pendingRemoteRead = new Set();
  const subscribedConversationIds = new Set();
  let activeAudioPlayer = null;
  let voiceCallManager = null;
  const voiceCallModals = {};
  let updatingCallConsent = false;

  const state = {
    conversations: [],
    filteredConversations: [],
    messagesByConversation: new Map(),
    messagesPagination: new Map(),
    searchTerm: '',
    conversationsLoaded: false,
    loadingConversations: false,
    loadingMessages: false,
    dismissedBanner: localStorage.getItem('mm-chat-security-dismissed') === '1',
    user: null,
    userId: null,
    unreadTotal: 0,
    activeParticipantAvatar: null,
    voiceSupported: false
  };

  const voiceState = {
    recorder: null,
    stream: null,
    chunks: [],
    recording: false,
    timerId: null,
    startedAt: null,
    mimeType: null,
    discardNext: false,
    uploading: false,
    lastDuration: null,
    conversationId: null
  };

  const dom = {};
  const ICON_SPRITE_PATH = '/icons/messages-icons.svg';
  const SEARCH_DEBOUNCE_MS = 300;

  function debounce(fn, wait) {
    let timeoutId = null;
    return function debounced(...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        fn.apply(this, args);
      }, wait);
    };
  }

  const scheduleSearchFilter = debounce(() => {
    applySearch();
  }, SEARCH_DEBOUNCE_MS);

  function getIconMarkup(name, className = '') {
    const classes = ['messages-icon', `messages-icon--${name}`];
    if (className) {
      classes.push(className);
    }
    const cls = classes.join(' ').trim();
    const symbolId = `icon-${name}`;
    return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="${ICON_SPRITE_PATH}#${symbolId}"></use></svg>`;
  }

  function createIconElement(name, className = '') {
    const template = document.createElement('template');
    template.innerHTML = getIconMarkup(name, className);
    return template.content.firstElementChild;
  }

  function formatPriceLabel(value) {
    if (value === null || value === undefined) return '';
    const amount = Number(value);
    if (Number.isNaN(amount)) return '';
    const formatted = PRICE_FORMATTER.format(amount);
    return formatted.replace('TND', 'DT').trim();
  }

  function normalizeAdImageSource(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }
    if (typeof value === 'object') {
      if (typeof value.url === 'string') return value.url.trim() || null;
      if (typeof value.src === 'string') return value.src.trim() || null;
    }
    return null;
  }

  function gatherConversationAdImages(ad) {
    if (!ad) return [];
    const urls = [];
    const push = (candidate) => {
      const normalized = normalizeAdImageSource(candidate);
      if (normalized && !urls.includes(normalized)) {
        urls.push(normalized);
      }
    };
    AD_IMAGE_ARRAY_KEYS.forEach((key) => {
      const source = ad[key];
      if (!source) return;
      if (Array.isArray(source)) {
        source.forEach(push);
      } else {
        push(source);
      }
    });
    ['thumbnail', 'cover', 'coverUrl', 'previewUrl', 'img'].forEach((key) => push(ad[key]));
    return urls;
  }

  function getConversationAdPrimaryImage(ad) {
    const [first] = gatherConversationAdImages(ad);
    return first || null;
  }

  function buildAdFallbackFromConversation(conversation) {
    if (!conversation?.ad) return null;
    const ad = conversation.ad;
    const adId = ad.id || conversation.adId || ad._id;
    if (!adId) return null;
    const gallery = gatherConversationAdImages(ad);
    if (!gallery.length) {
      gallery.push(AD_IMAGE_PLACEHOLDER);
    }
    const primary = gallery[0] || AD_IMAGE_PLACEHOLDER;
    const location = ad.locationText || 'Localisation à préciser';
    const date = ad.updatedAt || ad.createdAt || new Date().toISOString();
    const sellerName = conversation.otherParticipant?.name || ad.sellerName || 'Vendeur';
    const sellerAvatar = conversation.otherParticipant?.avatar || ad.sellerAvatar || null;
    const ownerId = ad.ownerId || (conversation.ownerId ? String(conversation.ownerId) : null);
    return {
      id: String(adId),
      title: ad.title || conversation.title || 'Annonce',
      desc: ad.description || ad.desc || '',
      price: Number(ad.price) || 0,
      category: ad.category || 'Autres',
      cat: ad.cat || ad.category || 'Autres',
      condition: ad.condition || null,
      state: ad.state || ad.condition || '—',
      locationText: location,
      city: ad.city || location,
      date,
      gallery,
      img: primary,
      attributes: ad.attributes || {},
      chips: Array.isArray(ad.chips) ? ad.chips : [],
      latlng: ad.latlng || null,
      views: ad.views || 0,
      likes: ad.likes || ad.favorites || 0,
      favorites: ad.favorites || ad.likes || 0,
      sellerName,
      sellerAvatar,
      sellerMemberSince: ad.sellerMemberSince || date,
      sellerAnnouncements: ad.sellerAnnouncements || null,
      ownerId,
      sellerEmail: ad.sellerEmail || ''
    };
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();
    bindUiEvents();
    setupLayoutObserver();
    hydrateUser();
    setupVoiceCallManager();
    if (state.userId) {
      startBackgroundSync();
    } else {
      updateUnreadBadge();
    }
    renderConversations();
    renderEmptyMessages();
    renderComposerAttachments();
    updateSendButtonState();
    updateSearchClearButton();
  }

  function cacheDom() {
    dom.overlay = document.getElementById('messagesOverlay');
    dom.modal = document.getElementById('messagesModal');
    dom.openTop = document.getElementById('navMessages');
    dom.openBottom = document.querySelector('.bn-btn[data-action="messages"]');
    dom.close = document.getElementById('messagesClose');
    dom.messagesLayout = document.getElementById('messagesLayout');
    dom.messagesUnreadBadge = document.getElementById('messagesUnreadBadge');
    dom.navMessagesBadge = document.getElementById('messagesNavBadge');
    dom.searchInput = document.getElementById('messagesSearch');
    dom.searchClear = document.getElementById('messagesSearchClear');
    dom.sidebar = document.getElementById('messagesSidebar');
    dom.conversationsList = document.getElementById('conversationsList');
    dom.conversationsEmpty = document.getElementById('conversationsEmpty');
    dom.chatPanel = document.getElementById('chatPanel');
    dom.chatBack = document.getElementById('chatBack');
    dom.chatDelete = document.getElementById('chatDelete');
    dom.chatAdThumb = document.getElementById('chatAdThumb');
    dom.chatCallBtn = document.getElementById('chatCallBtn');
    dom.chatTitle = document.getElementById('chatTitle');
    dom.chatSubtitle = document.getElementById('chatSubtitle');
    dom.chatBanner = document.getElementById('chatSecurityBanner');
    dom.chatBannerClose = document.getElementById('chatBannerClose');
    dom.messagesWrapper = document.querySelector('.chat-panel__messages-wrapper');
    dom.chatMessages = document.getElementById('chatMessages');
    dom.imageViewer = document.getElementById('imageViewer');
    dom.imageViewerImg = document.getElementById('imageViewerImg');
    dom.imageViewerClose = document.getElementById('imageViewerClose');
    if (dom.chatMessages) {
      dom.loadMoreButton = document.createElement('button');
      dom.loadMoreButton.type = 'button';
      dom.loadMoreButton.className = 'chat-messages__load-more';
      dom.loadMoreButton.textContent = 'Charger plus';
      dom.loadMoreButton.setAttribute('hidden', 'true');
      dom.loadMoreButton.addEventListener('click', handleLoadOlderMessages);
    }
    dom.typingIndicator = document.getElementById('typingIndicator');
    dom.typingIndicatorText = dom.typingIndicator?.querySelector('.mm-typing__text') || null;
    dom.typingIndicatorAvatar = dom.typingIndicator?.querySelector('.mm-typing__avatar') || null;
    if (dom.typingIndicator) {
      dom.typingIndicatorWrapper = document.createElement('div');
      dom.typingIndicatorWrapper.className = 'message-row message-row--typing';
      dom.typingIndicatorWrapper.appendChild(dom.typingIndicator);
    }
    dom.scrollToBottom = document.getElementById('scrollToBottom');
    dom.chatTextarea = document.getElementById('chatTextarea');
    dom.chatSend = document.getElementById('chatSend');
    dom.chatInputNote = document.getElementById('chatInputNote');
    dom.chatAttachmentPreview = document.getElementById('chatAttachmentPreview');
    dom.chatAttachButton = document.getElementById('chatAttachBtn');
    dom.chatFileInput = document.getElementById('chatFileInput');
    dom.chatVoiceBtn = document.getElementById('chatVoiceBtn');
    dom.chatVoiceStatus = document.getElementById('chatVoiceStatus');
    dom.chatVoiceTimer = document.getElementById('chatVoiceTimer');
    dom.chatVoiceCancel = document.getElementById('chatVoiceCancel');
    dom.chatCallConsent = document.getElementById('chatCallConsent');
    dom.chatCallConsentToggle = document.getElementById('chatCallConsentToggle');
    dom.chatCallConsentHint = document.getElementById('chatCallConsentHint');
    dom.chatCallConsentSelf = document.getElementById('chatCallConsentSelf');
    dom.chatCallConsentOther = document.getElementById('chatCallConsentOther');
    dom.chatCallConsentOtherLabel = document.getElementById('chatCallConsentOtherLabel');

    // Éléments pour l'appel vocal
    voiceCallModals.modal = document.getElementById('voiceCallModal');
    voiceCallModals.avatar = document.getElementById('voiceCallAvatar');
    voiceCallModals.username = document.getElementById('voiceCallUsername');
    voiceCallModals.status = document.getElementById('voiceCallStatus');
    voiceCallModals.connecting = document.getElementById('voiceCallConnecting');
    voiceCallModals.duration = document.getElementById('voiceCallDuration');
    voiceCallModals.answerBtn = document.getElementById('voiceCallAnswer');
    voiceCallModals.muteBtn = document.getElementById('voiceCallMute');
    voiceCallModals.endBtn = document.getElementById('voiceCallEnd');
    voiceCallModals.remoteAudio = document.getElementById('voiceCallRemoteAudio');
  }

  function bindUiEvents() {
    dom.openTop?.addEventListener('click', handleOpenModal);
    dom.openBottom?.addEventListener('click', handleOpenModal);
    dom.close?.addEventListener('click', closeModal);
    dom.overlay?.addEventListener('click', closeModal);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (dom.imageViewer && !dom.imageViewer.hidden) {
          event.preventDefault();
          closeImageViewer();
        } else if (dom.modal?.classList.contains('mm-open')) {
          event.preventDefault();
          closeModal();
        }
      }
    });

    dom.imageViewerClose?.addEventListener('click', closeImageViewer);
    dom.imageViewer
      ?.querySelector('.image-viewer__overlay')
      ?.addEventListener('click', closeImageViewer);

    dom.searchInput?.addEventListener('input', handleSearchInput);
    dom.searchClear?.addEventListener('click', handleSearchClear);
    dom.chatBack?.addEventListener('click', handleBackToList);
    dom.chatDelete?.addEventListener('click', handleHideConversation);
    dom.chatAdThumb?.addEventListener('click', handleAdThumbClick);
    dom.chatBannerClose?.addEventListener('click', dismissSecurityBanner);
    dom.scrollToBottom?.addEventListener('click', () =>
      scrollMessagesToBottom({ smooth: true, force: true })
    );

    if (dom.chatTextarea && dom.chatSend) {
      dom.chatTextarea.addEventListener('input', handleTextareaInput);
      dom.chatTextarea.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          handleSendMessage();
        }
      });
      dom.chatSend.addEventListener('click', handleSendMessage);
    }

    dom.chatAttachButton?.addEventListener('click', handleAttachClick);
    dom.chatFileInput?.addEventListener('change', handleAttachmentSelection);
    dom.chatAttachmentPreview?.addEventListener('click', handleAttachmentRemove);
    dom.chatCallBtn?.addEventListener('click', handleCallButtonClick);
    dom.chatCallConsentToggle?.addEventListener('change', handleCallConsentToggle);
    setupVoiceRecorderControls();
    dom.chatMessages?.addEventListener('click', handleMessageActionClick);

    dom.conversationsList?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-conversation-id]');
      if (!button) return;
      const conversationId = button.getAttribute('data-conversation-id');
      if (conversationId) {
        selectConversation(conversationId);
      }
    });

    document.addEventListener('auth:change', handleAuthChange);
    document.addEventListener('chat:conversation-started', handleConversationStartedEvent);
  }

  function setupLayoutObserver() {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    compactLayoutQuery = window.matchMedia(`(max-width: ${LAYOUT_BREAKPOINT}px)`);
    const applyLayout = () => {
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(syncLayoutMode);
      } else {
        syncLayoutMode();
      }
    };
    if (typeof compactLayoutQuery.addEventListener === 'function') {
      compactLayoutQuery.addEventListener('change', applyLayout);
    } else if (typeof compactLayoutQuery.addListener === 'function') {
      compactLayoutQuery.addListener(applyLayout);
    }
    syncLayoutMode();
  }

  function isCompactLayout() {
    if (compactLayoutQuery) {
      return compactLayoutQuery.matches;
    }
    return window.innerWidth <= LAYOUT_BREAKPOINT;
  }

  function syncLayoutMode() {
    if (!dom.chatPanel || !dom.messagesLayout) return;
    if (isCompactLayout()) {
      if (activeConversationId) {
        dom.chatPanel.classList.remove('chat-panel--hidden');
        dom.messagesLayout.classList.add('messages-layout--detail');
      } else {
        dom.chatPanel.classList.add('chat-panel--hidden');
        dom.messagesLayout.classList.remove('messages-layout--detail');
      }
    } else {
      dom.chatPanel.classList.remove('chat-panel--hidden');
      dom.messagesLayout.classList.remove('messages-layout--detail');
    }
  }

  function hydrateUser() {
    state.user = getCurrentUser();
    state.userId = state.user?._id ? String(state.user._id) : null;
    if (!state.userId) {
      resetState();
      renderUnauthenticated();
    }
  }

  function startBackgroundSync() {
    if (!state.userId) return;
    ensureSocket();
    refreshUnreadCountFromServer();
    if (!state.conversationsLoaded && !state.loadingConversations) {
      loadConversations();
    }
  }

  async function refreshUnreadCountFromServer() {
    if (!state.userId) {
      state.unreadTotal = 0;
      updateUnreadBadge();
      return;
    }
    if (unreadCountRequest) return unreadCountRequest;
    unreadCountRequest = apiFetch('/chat/unread-count')
      .then((payload) => {
        if (!state.userId) {
          return;
        }
        const rawCount =
          typeof payload === 'number'
            ? payload
            : typeof payload?.count === 'number'
              ? payload.count
              : 0;
        state.unreadTotal = Math.max(0, rawCount);
        updateUnreadBadge();
      })
      .catch((error) => {
        console.warn('[chat] Impossible de récupérer le compteur de conversations non lues', error);
      })
      .finally(() => {
        unreadCountRequest = null;
      });
    return unreadCountRequest;
  }

  function disconnectSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  function handleAuthChange(event) {
    state.user = event?.detail ?? getCurrentUser();
    state.userId = state.user?._id ? String(state.user._id) : null;
    resetState();
    if (!state.userId) {
      disconnectSocket();
      renderUnauthenticated();
      return;
    }
    startBackgroundSync();
    if (dom.modal?.classList.contains('mm-open')) {
      loadConversations({ force: true });
    }
  }

  function getCurrentUser() {
    try {
      if (window.authStore && typeof window.authStore.get === 'function') {
        return window.authStore.get();
      }
    } catch (error) {
      console.warn('[chat] impossible de lire authStore', error);
    }
    return null;
  }

  function resetState() {
    activeConversationId = null;
    state.conversations = [];
    state.filteredConversations = [];
    state.messagesByConversation.clear();
    state.conversationsLoaded = false;
    state.loadingConversations = false;
    state.loadingMessages = false;
    state.searchTerm = '';
    state.unreadTotal = 0;
    pendingRead.clear();
    pendingMessages.clear();
    pendingAudioUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_error) {
        // ignore
      }
    });
    pendingAudioUrls.clear();
    pendingRemoteRead.clear();
    subscribedConversationIds.clear();
    pendingSelectConversationId = null;
    if (readFlushTimer) {
      clearTimeout(readFlushTimer);
      readFlushTimer = null;
    }
    if (dom.searchInput) {
      dom.searchInput.value = '';
    }
    updateSearchClearButton();
    clearComposerAttachments();
    cancelVoiceRecording();
    voiceState.uploading = false;
    updateVoiceUi();
    updateUnreadBadge();
    renderConversations();
    renderEmptyMessages();
    hideChatPanel();
  }

  function renderUnauthenticated() {
    if (!dom.modal) return;
    showConversationsEmpty({
      icon: getIconMarkup('lock'),
      title: 'Messagerie réservée',
      text: 'Connectez-vous pour retrouver vos conversations.'
    });
    hideChatPanel();
  }

  function handleOpenModal(event) {
    event.preventDefault();
    openModal();
  }

  function openModal({ conversationId = null } = {}) {
    if (!dom.modal) return;
    hydrateUser();
    if (!state.userId) {
      // Utilisateur non connecté: feedback uniquement, ne pas ouvrir modal.
      if (typeof window.showToast === 'function') {
        window.showToast('Connectez-vous pour ouvrir la messagerie.');
      }
      return; // On stop ici, pas d'ouverture d'overlay ni du modal
    }
    ensureSocket();
    if (!state.conversationsLoaded && !state.loadingConversations) {
      loadConversations();
    }

    if (conversationId) {
      pendingSelectConversationId = conversationId;
      if (state.conversationsLoaded) {
        selectConversationIfAvailable(conversationId);
      }
    }
    if (dom.overlay) {
      dom.overlay.hidden = false;
      requestAnimationFrame(() => dom.overlay.classList.add('active'));
      dom.overlay.setAttribute('aria-hidden', 'false');
    }
    dom.modal.classList.add('mm-open');
    dom.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    syncLayoutMode();
  }

  function closeModal() {
    if (!dom.modal) return;
    dom.modal.classList.remove('mm-open');
    dom.modal.setAttribute('aria-hidden', 'true');
    if (dom.overlay) {
      dom.overlay.classList.remove('active');
      dom.overlay.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        if (dom.overlay && !dom.modal.classList.contains('mm-open')) {
          dom.overlay.hidden = true;
        }
      }, 220);
    }
    if (dom.chatTextarea) {
      dom.chatTextarea.value = '';
      dom.chatInputNote?.setAttribute('hidden', 'true');
    }
    clearComposerAttachments();
    cancelVoiceRecording();
    document.body.style.overflow = '';
  }

  function openImageViewer(imageUrl) {
    if (!dom.imageViewer || !dom.imageViewerImg) return;
    dom.imageViewerImg.src = imageUrl;
    dom.imageViewer.hidden = false;
  }

  function closeImageViewer() {
    if (!dom.imageViewer) return;
    dom.imageViewer.hidden = true;
    if (dom.imageViewerImg) {
      dom.imageViewerImg.src = '';
    }
  }

  function ensureSocket() {
    // ...existing code...
    if (socket || !state.userId) return socket;
    if (!window.io) {
      console.warn('[chat] Socket.IO client manquant');
      return null;
    }
    const token = window.__ACCESS_TOKEN__ || null;
    // ...existing code...
    socket = window.io(window.location.origin, {
      path: SOCKET_PATH,
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 6,
      reconnectionDelay: 750,
      timeout: 20000
    });

    // ...existing code...

    // Écouter les événements de connexion
    socket.on('connect', () => {
      // ...existing code...
    });

    socket.on('connect_error', (error) => {
      console.error('[Messages] Erreur de connexion Socket:', error.message);
    });

    socket.on('disconnect', (reason) => {
      messagesDebugWarn('[Messages] Socket DÉCONNECTÉ:', reason);
    });

    bindSocketEvents();

    // Initialiser le gestionnaire d'appels vocaux avec le socket
    // ...existing code...
    if (voiceCallManager && !voiceCallManager.socket) {
      voiceCallManager.init(socket);
    }

    return socket;
  }

  function bindSocketEvents() {
    if (!socket) return;

    // Helper pour rétablir les rooms des conversations suivies
    const rejoinConversationRooms = () => {
      if (!socket?.connected || !subscribedConversationIds.size) return;
      subscribedConversationIds.forEach((conversationId) => {
        socket.emit('conversation:join', {
          conversationId,
          markAsRead: conversationId === activeConversationId
        });
      });
    };

    socket.on('connect', () => {
      // ...existing code...
      rejoinConversationRooms();
    });
    socket.on('error', (payload) => {
      console.warn('[chat:error]', payload);
      if (
        payload?.code === 'CALL_CONSENT_REQUIRED' ||
        payload?.code === 'CALL_RECIPIENT_NOT_READY'
      ) {
        if (typeof window.showToast === 'function' && payload?.message) {
          window.showToast(payload.message);
        }
      }
    });
    socket.on('message:new', async (payload) => {
      // ...existing code...
      await handleIncomingMessage(payload);
    });
    socket.on('message:delivered', (payload) => {
      updateMessageStatus(payload.messageId, 'delivered', payload.deliveredAt);
    });
    socket.on('message:read', (payload) => {
      if (!payload?.messageIds?.length) return;
      payload.messageIds.forEach((id) => updateMessageStatus(id, 'read', payload.readAt));
    });
    socket.on('typing:start', ({ conversationId, userId }) => {
      if (conversationId === activeConversationId && userId !== state.userId) {
        showTypingIndicator(conversationId);
      }
    });
    socket.on('typing:stop', ({ conversationId, userId }) => {
      if (conversationId === activeConversationId && userId !== state.userId) {
        hideTypingIndicator({ delay: 600 });
      }
    });
    socket.on('conversation:call-consent', handleCallConsentEvent);
  }

  async function loadConversations({ force = false } = {}) {
    if (state.loadingConversations) return;
    if (!force && state.conversationsLoaded && state.conversations.length) return;

    state.loadingConversations = true;
    showConversationsSkeleton();
    try {
      const data = await apiFetch('/chat/conversations', {
        query: { limit: CONVERSATION_LIMIT }
      });
      const conversations = Array.isArray(data) ? data : [];
      state.conversations = conversations.map(enhanceConversation);
      sortConversations(state.conversations);
      state.filteredConversations = [...state.conversations];
      state.conversationsLoaded = true;
      state.unreadTotal = countUnreadConversations(state.conversations);
      applySearch();
      updateUnreadBadge();
      subscribeConversationsForRealtime(state.conversations);
      if (!state.conversations.length) {
        showConversationsEmpty({
          icon: '💬',
          title: 'Aucune conversation pour le moment',
          text: 'Contactez un vendeur pour démarrer une conversation !'
        });
      } else {
        hideConversationsEmpty();
      }
    } catch (error) {
      console.error('[chat] Impossible de charger les conversations', error);
      showConversationsEmpty({
        icon: getIconMarkup('alert'),
        title: 'Chargement impossible',
        text: error.message || 'Vérifiez votre connexion.'
      });
    } finally {
      state.loadingConversations = false;
      if (pendingSelectConversationId) {
        selectConversationIfAvailable(pendingSelectConversationId);
      }
    }
  }

  function subscribeConversationsForRealtime(conversations) {
    if (!Array.isArray(conversations) || !conversations.length) return;
    conversations.forEach((conversation) => {
      const conversationId = conversation?.id;
      if (conversationId) {
        joinConversation(conversationId);
      }
    });
  }

  async function fetchConversationById(conversationId) {
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}`);
      const conversation = data?.conversation || data;
      return conversation ? enhanceConversation(conversation) : null;
    } catch (error) {
      console.warn('[chat] Conversation introuvable', conversationId, error);
      return null;
    }
  }

  async function handleIncomingMessage(payload) {
    // ...existing code...

    if (!payload?.conversationId || !payload?.message) {
      console.warn('[DEBUG] Payload invalide, abandon');
      return;
    }

    const conversationId = String(payload.conversationId);
    const message = enhanceMessage(payload.message);

    // ...existing code...

    if (!state.conversationsLoaded) {
      refreshUnreadCountFromServer();
    }

    let conversation = findConversation(conversationId);
    const alreadyKnown = Boolean(conversation);
    if (!alreadyKnown) {
      conversation = await fetchConversationById(conversationId);
      if (!conversation) return;
      upsertConversation(conversation);
      applySearch();
    }
    joinConversation(conversationId);

    updateConversationPreview(conversationId, message);
    storeMessage(conversationId, message);

    if (conversationId === activeConversationId) {
      // ...existing code...
      insertMessageIntoActive(message);
      if (message.sender !== state.userId) {
        socket?.emit('message:received', { conversationId, messageId: message.id });
        scheduleMarkRead(message.id);
        hideTypingIndicator();
      }
      markConversationAsRead(conversationId);
    } else if (message.sender !== state.userId) {
      // ...existing code...
      incrementConversationUnread(conversationId);
    }

    moveConversationToTop(conversationId);
    applySearch();
  }

  async function loadMessages(conversationId, { force = false } = {}) {
    if (state.loadingMessages) return;
    const existing = state.messagesByConversation.get(conversationId);
    if (existing?.length && !force && state.messagesPagination.has(conversationId)) {
      renderMessages(conversationId);
      scrollMessagesToBottom({ smooth: false });
      return;
    }

    state.loadingMessages = true;
    showMessagesSkeleton();
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        query: { limit: MESSAGE_LIMIT }
      });
      const messages = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data)
          ? data
          : [];
      const formatted = messages.map(enhanceMessage).sort((a, b) => a.createdAt - b.createdAt);
      state.messagesByConversation.set(conversationId, formatted);
      state.messagesPagination.set(conversationId, { hasMore: Boolean(data?.hasMore) });
      renderMessages(conversationId);
      scrollMessagesToBottom({ smooth: false, force: true });
    } catch (error) {
      console.error('[chat] Chargement des messages échoué', error);
      showMessagesError(error?.message || 'Impossible de charger cette conversation.');
    } finally {
      state.loadingMessages = false;
    }
  }

  async function loadOlderMessages(conversationId, beforeDate) {
    if (!conversationId || !beforeDate) return false;
    const cursor =
      beforeDate instanceof Date ? beforeDate.toISOString() : new Date(beforeDate).toISOString();
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        query: { limit: OLDER_MESSAGES_LIMIT, before: cursor }
      });
      const payload = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data)
          ? data
          : [];
      const enhanced = payload.map(enhanceMessage).sort((a, b) => a.createdAt - b.createdAt);
      enhanced.forEach((message) => {
        storeMessage(conversationId, message);
      });
      state.messagesPagination.set(conversationId, { hasMore: Boolean(data?.hasMore) });
      if (conversationId === activeConversationId) {
        renderMessages(conversationId);
      }
      return enhanced.length > 0;
    } catch (error) {
      console.error('[chat] Impossible de charger plus de messages', error);
      if (conversationId === activeConversationId && typeof window.showToast === 'function') {
        window.showToast('Impossible de charger les messages précédents.');
      }
      return false;
    }
  }

  function buildVoiceCallConsentState(raw = {}) {
    const toDate = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const me = raw?.me || {};
    const other = raw?.other || {};
    return {
      me: {
        allowed: Boolean(me.allowed),
        updatedAt: toDate(me.updatedAt),
        updatedBy: me.updatedBy || null
      },
      other: {
        allowed: Boolean(other.allowed),
        updatedAt: toDate(other.updatedAt),
        updatedBy: other.updatedBy || null
      },
      ready: Boolean(me.allowed && other.allowed)
    };
  }

  function ensureConversationConsent(conversation) {
    if (!conversation) {
      return buildVoiceCallConsentState();
    }
    if (!conversation.voiceCallConsent) {
      conversation.voiceCallConsent = buildVoiceCallConsentState();
    }
    return conversation.voiceCallConsent;
  }

  function enhanceConversation(raw) {
    if (!raw) return null;
    const id = String(raw.id || raw._id);
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
    const other = raw.otherParticipant || null;
    const ad = raw.ad || null;
    const lastMessageRaw =
      raw.lastMessage && typeof raw.lastMessage === 'object' ? raw.lastMessage : null;
    const lastMessage = lastMessageRaw
      ? {
          ...lastMessageRaw,
          id: lastMessageRaw.id
            ? String(lastMessageRaw.id)
            : lastMessageRaw._id
              ? String(lastMessageRaw._id)
              : undefined,
          sender: lastMessageRaw.sender ? String(lastMessageRaw.sender) : lastMessageRaw.sender,
          recipient: lastMessageRaw.recipient
            ? String(lastMessageRaw.recipient)
            : lastMessageRaw.recipient,
          status: lastMessageRaw.status || lastMessageRaw.deliveryStatus || null,
          createdAt: lastMessageRaw.createdAt
            ? new Date(lastMessageRaw.createdAt)
            : raw.lastMessageAt
              ? new Date(raw.lastMessageAt)
              : null,
          attachments: Array.isArray(lastMessageRaw.attachments) ? lastMessageRaw.attachments : [],
          text: lastMessageRaw.text || '',
          type: lastMessageRaw.type || (lastMessageRaw.audio ? 'audio' : 'text'),
          audio:
            (lastMessageRaw.type || (lastMessageRaw.audio ? 'audio' : 'text')) === 'audio'
              ? lastMessageRaw.audio
                ? {
                    ...lastMessageRaw.audio,
                    duration:
                      typeof lastMessageRaw.audio.duration === 'number'
                        ? lastMessageRaw.audio.duration
                        : (lastMessageRaw.audioDuration ?? null)
                  }
                : { duration: lastMessageRaw.audioDuration ?? null }
              : null
        }
      : null;
    const lastMessageAt = raw.lastMessageAt
      ? new Date(raw.lastMessageAt)
      : lastMessage?.createdAt || null;
    const title = ad?.title || raw.lastMessagePreview || 'Conversation';
    const lastMessagePreview =
      raw.lastMessagePreview || (lastMessage ? getMessagePreview(lastMessage) : '');
    return {
      id,
      ad,
      adId: raw.adId ? String(raw.adId) : null,
      title,
      otherParticipant: other
        ? {
            id: other.id ? String(other.id) : String(other),
            name: other.name || 'Contact',
            avatar: other.avatar || null
          }
        : null,
      lastMessage,
      lastMessagePreview,
      lastMessageAt,
      createdAt,
      unreadCount: raw.unreadCount || 0,
      isBlocked: Boolean(raw.isBlocked),
      blockedBy: raw.blockedBy || null,
      hidden: Boolean(raw.hidden),
      voiceCallConsent: buildVoiceCallConsentState(raw.voiceCallConsent)
    };
  }

  function enhanceMessage(raw) {
    if (!raw) return null;
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
    const deliveredAt = raw.deliveredAt ? new Date(raw.deliveredAt) : null;
    const readAt = raw.readAt ? new Date(raw.readAt) : null;
    return {
      id: String(raw.id || raw._id),
      clientTempId: raw.clientTempId || null,
      conversationId: String(raw.conversationId || raw.conversation || raw.conversationId),
      sender: raw.sender ? String(raw.sender) : null,
      recipient: raw.recipient ? String(raw.recipient) : null,
      text: raw.text || '',
      type: raw.type || (raw.audio ? 'audio' : 'text'),
      audio: raw.audio
        ? {
            ...raw.audio,
            duration:
              typeof raw.audio.duration === 'number' ? raw.audio.duration : raw.audioDuration
          }
        : null,
      attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
      status: raw.status || 'sent',
      createdAt,
      deliveredAt,
      readAt
    };
  }

  function findConversation(conversationId) {
    return state.conversations.find((conversation) => conversation.id === conversationId) || null;
  }

  function upsertConversation(conversation) {
    if (!conversation) return;
    const index = state.conversations.findIndex((c) => c.id === conversation.id);
    const nextHasUnread = conversation.unreadCount > 0;
    if (index >= 0) {
      const previousHasUnread = state.conversations[index].unreadCount > 0;
      state.conversations[index] = conversation;
      if (state.conversationsLoaded && previousHasUnread !== nextHasUnread) {
        state.unreadTotal = Math.max(0, state.unreadTotal + (nextHasUnread ? 1 : -1));
      }
    } else {
      state.conversations.push(conversation);
      if (state.conversationsLoaded && nextHasUnread) {
        state.unreadTotal += 1;
      }
      joinConversation(conversation.id);
    }
    sortConversations(state.conversations);
    state.filteredConversations = [...state.conversations];
  }

  function sortConversations(list) {
    list.sort((a, b) => {
      const aDate = a.lastMessageAt || a.createdAt || new Date(0);
      const bDate = b.lastMessageAt || b.createdAt || new Date(0);
      return bDate - aDate;
    });
  }

  function applySearch() {
    const term = state.searchTerm.trim().toLowerCase();
    if (!term) {
      state.filteredConversations = [...state.conversations];
    } else {
      state.filteredConversations = state.conversations.filter((conversation) => {
        const haystack = [
          conversation.title,
          conversation.otherParticipant?.name,
          conversation.lastMessagePreview
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    renderConversations();
  }

  function renderConversations() {
    if (!dom.conversationsList) return;
    dom.conversationsList.innerHTML = '';
    if (!state.filteredConversations.length) {
      if (!state.loadingConversations) {
        showConversationsEmpty(
          state.searchTerm
            ? {
                icon: getIconMarkup('search'),
                title: 'Aucun résultat',
                text: 'Aucune conversation ne correspond à votre recherche.'
              }
            : undefined
        );
      }
      return;
    }
    hideConversationsEmpty();

    const fragment = document.createDocumentFragment();
    state.filteredConversations.forEach((conversation) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'conversation-item';
      button.setAttribute('data-conversation-id', conversation.id);
      if (conversation.id === activeConversationId) {
        button.classList.add('is-active');
      }
      if (conversation.unreadCount > 0) {
        button.classList.add('has-unread');
      }

      const cover = document.createElement('span');
      cover.className = 'conversation-item__cover';
      cover.innerHTML = buildConversationCover(conversation);
      button.appendChild(cover);

      const main = document.createElement('span');
      main.className = 'conversation-item__main';

      const header = document.createElement('div');
      header.className = 'conversation-item__header';

      const title = document.createElement('span');
      title.className = 'conversation-item__title';
      title.textContent = conversation.title || 'Conversation';
      header.appendChild(title);

      const time = document.createElement('time');
      time.className = 'conversation-item__time';
      if (conversation.lastMessageAt) {
        time.dateTime = conversation.lastMessageAt.toISOString();
        time.textContent = formatRelativeTime(conversation.lastMessageAt);
      }
      header.appendChild(time);

      const preview = document.createElement('p');
      preview.className = 'conversation-item__preview';
      populateConversationPreview(preview, conversation);

      const footer = document.createElement('div');
      footer.className = 'conversation-item__footer';

      const contact = document.createElement('span');
      contact.className = 'conversation-item__contact';
      const contactAvatar = document.createElement('span');
      contactAvatar.className = 'conversation-item__contact-avatar';
      contactAvatar.innerHTML = buildContactAvatar(conversation);
      contact.appendChild(contactAvatar);
      const contactName = document.createElement('span');
      contactName.className = 'conversation-item__contact-name';
      contactName.textContent = getConversationContactName(conversation);
      contact.appendChild(contactName);
      footer.appendChild(contact);

      const lastMessage = conversation.lastMessage || null;
      const fromMe = lastMessage?.sender === state.userId;
      const lastStatus = lastMessage?.status || lastMessage?.deliveryStatus || null;

      if (conversation.unreadCount > 0) {
        const pill = document.createElement('span');
        pill.className = 'conversation-item__pill';
        pill.textContent =
          conversation.unreadCount > 1 ? `${conversation.unreadCount} non lus` : 'Nouveau';
        footer.appendChild(pill);
      } else if (fromMe && lastStatus) {
        const status = document.createElement('span');
        status.className = 'conversation-item__status';
        status.dataset.status = lastStatus;
        const display = getStatusDisplay(lastStatus);
        status.textContent = display.label;
        footer.appendChild(status);
      }

      main.appendChild(header);
      main.appendChild(preview);
      main.appendChild(footer);

      button.appendChild(main);

      if (conversation.unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'conversation-item__badge';
        badge.textContent =
          conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount);
        button.appendChild(badge);
      }

      fragment.appendChild(button);
    });

    dom.conversationsList.appendChild(fragment);
  }

  function populateConversationPreview(element, conversation) {
    if (!element) return;
    element.innerHTML = '';
    const previewText = (conversation.lastMessagePreview || '').trim() || 'Commencez la discussion';

    const textSpan = document.createElement('span');
    textSpan.className = 'conversation-item__preview-text';
    textSpan.textContent = previewText;
    element.appendChild(textSpan);
  }

  function renderMessageStatus(statusElement, message) {
    if (!statusElement || !message) return;
    const statusValue = message.status || 'sent';
    const display = getStatusDisplay(statusValue);
    statusElement.dataset.status = statusValue;
    statusElement.innerHTML = '';
    if (display.icon) {
      const icon = createIconElement(display.icon, 'message-status__icon');
      if (display.spinner) {
        icon.classList.add('is-spinning');
      }
      statusElement.appendChild(icon);
    }
    if (display.label) {
      const label = document.createElement('span');
      label.textContent = display.label;
      statusElement.appendChild(label);
    }
    if (statusValue === 'failed' && message.sender === state.userId) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'message-retry-btn';
      retry.setAttribute('data-retry-message', message.clientTempId || message.id);
      retry.setAttribute('aria-label', 'Réessayer l’envoi');
      retry.textContent = 'Réessayer';
      statusElement.appendChild(retry);
    }
  }

  function buildConversationCover(conversation) {
    const ad = conversation.ad || {};
    const candidates = [
      ad.thumbnail,
      ad.cover,
      ad.coverUrl,
      ad.preview,
      ad.previewUrl,
      ad.image,
      ad.media,
      ad.picture
    ];
    if (Array.isArray(ad.thumbnails)) {
      candidates.push(ad.thumbnails[0]);
    }
    if (Array.isArray(ad.photos)) {
      candidates.push(ad.photos[0]);
    }
    if (Array.isArray(ad.images)) {
      candidates.push(ad.images[0]);
    }
    if (Array.isArray(ad.previews)) {
      candidates.push(ad.previews[0]);
    }
    if (Array.isArray(ad.pictures)) {
      candidates.push(ad.pictures[0]);
    }

    const source = candidates.find((value) => {
      if (typeof value === 'string' && value.trim().length > 0) return true;
      if (value && typeof value === 'object' && typeof value.url === 'string' && value.url.trim()) {
        return true;
      }
      return false;
    });

    let image = null;
    if (typeof source === 'string') {
      image = source.trim();
    } else if (source && typeof source === 'object' && typeof source.url === 'string') {
      image = source.url.trim();
    }

    if (image) {
      const altText =
        conversation.ad?.title ||
        conversation.title ||
        getConversationContactName(conversation) ||
        'Annonce';
      return `<img class="conversation-item__cover-img" src="${encodeURI(
        image
      )}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" width="72" height="72">`;
    }
    return `<span class="conversation-item__cover-fallback" aria-hidden="true">${getIconMarkup('image')}</span>`;
  }

  function buildContactAvatar(conversation) {
    const image = conversation.otherParticipant?.avatar || null;
    if (image) {
      return `<img class="conversation-item__contact-avatar-img" src="${encodeURI(
        image
      )}" alt="" loading="lazy" decoding="async" width="20" height="20" aria-hidden="true">`;
    }
    const name = conversation.otherParticipant?.name || conversation.title || '';
    const letter = name.charAt(0).toUpperCase() || '?';
    return `<span class="conversation-item__contact-avatar-fallback">${letter}</span>`;
  }

  function getConversationContactName(conversation) {
    if (!conversation) return 'Contact';
    const participant = conversation.otherParticipant || {};
    return (
      participant.name ||
      participant.displayName ||
      participant.fullName ||
      participant.username ||
      conversation.ad?.ownerName ||
      conversation.title ||
      'Contact'
    );
  }

  function showConversationsSkeleton() {
    if (!dom.conversationsList) return;
    dom.conversationsList.innerHTML = '';
    hideConversationsEmpty();
    for (let index = 0; index < 4; index += 1) {
      const skeleton = document.createElement('div');
      skeleton.className = 'conversation-item conversation-item--skeleton';
      skeleton.innerHTML = `
        <span class="conversation-item__cover">
          <span class="skeleton-rect skeleton-rect--cover"></span>
        </span>
        <span class="conversation-item__main">
          <span class="skeleton-line skeleton-line--lg"></span>
          <span class="skeleton-line skeleton-line--md"></span>
          <span class="skeleton-line skeleton-line--sm"></span>
        </span>
      `;
      dom.conversationsList.appendChild(skeleton);
    }
  }

  function showConversationsEmpty(content) {
    if (!dom.conversationsEmpty) return;
    // Nouveau markup .mm-empty + rétrocompatibilité ancien.
    const icon =
      dom.conversationsEmpty.querySelector('.mm-empty-illu') ||
      dom.conversationsEmpty.querySelector('.conversations-list__empty-icon');
    const title =
      dom.conversationsEmpty.querySelector('.mm-empty-title') ||
      dom.conversationsEmpty.querySelector('.conversations-list__empty-title') ||
      dom.conversationsEmpty.querySelector('h3');
    const text =
      dom.conversationsEmpty.querySelector('.mm-empty-text') ||
      dom.conversationsEmpty.querySelector('.conversations-list__empty-text') ||
      dom.conversationsEmpty.querySelector('p');
    const iconMarkup = content?.icon || '💬';
    if (icon) icon.innerHTML = iconMarkup;
    if (content?.title && title) title.textContent = content.title;
    if (content?.text && text) text.textContent = content.text;
    dom.conversationsEmpty.hidden = false;

    // Cacher chatPanel et messagesSidebar quand il n'y a pas de conversations
    if (dom.chatPanel) {
      dom.chatPanel.style.display = 'none';
    }
    if (dom.sidebar) {
      dom.sidebar.style.display = 'none';
    }
  }

  function hideConversationsEmpty() {
    if (dom.conversationsEmpty) {
      dom.conversationsEmpty.hidden = true;
    }

    // Réafficher chatPanel et messagesSidebar quand il y a des conversations
    if (dom.chatPanel) {
      dom.chatPanel.style.display = '';
    }
    if (dom.sidebar) {
      dom.sidebar.style.display = '';
    }
  }

  function hideLoadMoreButton() {
    if (!dom.loadMoreButton) return;
    dom.loadMoreButton.setAttribute('hidden', 'true');
    dom.loadMoreButton.disabled = false;
    dom.loadMoreButton.textContent = 'Charger plus';
  }

  function renderEmptyMessages() {
    if (!dom.chatMessages) return;
    hideLoadMoreButton();
    dom.chatMessages.innerHTML =
      '<div class="chat-panel__empty">Sélectionnez une conversation pour lire vos échanges.</div>';
  }

  function showMessagesSkeleton() {
    if (!dom.chatMessages) return;
    dom.chatMessages.innerHTML = '';
    dom.chatMessages.classList.add('is-loading');
    hideLoadMoreButton();
    for (let index = 0; index < 6; index += 1) {
      const bubble = document.createElement('div');
      bubble.className = 'message-row message-row--skeleton';
      bubble.innerHTML = `
        <span class="message-bubble">
          <span class="skeleton-line skeleton-line--md"></span>
          <span class="skeleton-line skeleton-line--xs"></span>
        </span>
      `;
      dom.chatMessages.appendChild(bubble);
    }
  }

  function showMessagesError(message) {
    if (!dom.chatMessages) return;
    dom.chatMessages.classList.remove('is-loading');
    hideLoadMoreButton();
    dom.chatMessages.innerHTML = `<div class="chat-panel__empty">${escapeHtml(message)}</div>`;
  }

  function selectConversation(conversationId) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;

    if (activeConversationId && activeConversationId !== conversationId) {
      socket?.emit('conversation:leave', { conversationId: activeConversationId });
    }

    activeConversationId = conversationId;
    state.activeParticipantAvatar = conversation.otherParticipant?.avatar || null;
    highlightSelectedConversation(conversationId);
    showChatPanel(conversation);
    clearComposerAttachments();
    hideTypingIndicator();
    joinConversation(conversationId, { markAsRead: true });
    markConversationAsRead(conversationId);
    loadMessages(conversationId);
    updateVoiceUi();
    updateCallButtonVisibility();
    pendingSelectConversationId = null;
  }

  function selectConversationIfAvailable(conversationId) {
    if (!conversationId) return;
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    if (dom.modal?.classList.contains('mm-open')) {
      selectConversation(conversationId);
    }
  }

  function highlightSelectedConversation(conversationId) {
    if (!dom.conversationsList) return;
    dom.conversationsList.querySelectorAll('.conversation-item').forEach((node) => {
      const id = node.getAttribute('data-conversation-id');
      if (id === conversationId) {
        node.classList.add('is-active');
      } else {
        node.classList.remove('is-active');
      }
    });
  }

  function showChatPanel(conversation) {
    if (!dom.chatPanel) return;
    dom.chatPanel.classList.remove('chat-panel--hidden');
    if (isCompactLayout()) {
      dom.messagesLayout?.classList.add('messages-layout--detail');
    } else {
      dom.messagesLayout?.classList.remove('messages-layout--detail');
    }
    dom.chatTitle.textContent = conversation.title || 'Conversation';
    const sellerName = conversation.ad?.ownerName || '';
    const adTitle = conversation.ad?.title || '';
    const city = conversation.ad?.locationText || '';
    const priceLabel = formatPriceLabel(conversation.ad?.price);
    const subtitleParts = [sellerName, city, priceLabel].filter(Boolean);
    dom.chatSubtitle.textContent = subtitleParts.join(' • ') || sellerName || adTitle || '';

    // Gérer la miniature de l'annonce
    if (dom.chatAdThumb && conversation.ad) {
      const adImage = getConversationAdPrimaryImage(conversation.ad);

      dom.chatAdThumb.title = `Voir l'annonce : ${adTitle}`;
      dom.chatAdThumb.setAttribute('aria-label', `Voir l'annonce : ${adTitle}`);
      dom.chatAdThumb.innerHTML = '';

      if (adImage) {
        const img = document.createElement('img');
        img.src = adImage;
        img.alt = adTitle || 'Annonce';
        img.loading = 'lazy';
        img.decoding = 'async';
        dom.chatAdThumb.appendChild(img);
        dom.chatAdThumb.classList.remove('chat-panel__ad-thumb--placeholder');
      } else {
        dom.chatAdThumb.classList.add('chat-panel__ad-thumb--placeholder');
        dom.chatAdThumb.innerHTML = `
          <svg class="messages-icon" aria-hidden="true" focusable="false">
            <use href="/icons/messages-icons.svg#icon-image"></use>
          </svg>
        `;
      }
      dom.chatAdThumb.hidden = false;
    } else if (dom.chatAdThumb) {
      dom.chatAdThumb.hidden = true;
    }

    dom.chatDelete.hidden = false;
    dom.chatDelete.disabled = false;
    if (dom.chatBanner) {
      if (state.dismissedBanner) {
        dom.chatBanner.setAttribute('hidden', 'true');
      } else {
        dom.chatBanner.removeAttribute('hidden');
      }
    }
    syncLayoutMode();
    updateVoiceUi();
    updateCallButtonVisibility();
  }

  function hideChatPanel() {
    renderEmptyMessages();
    if (!dom.chatPanel) return;
    if (isCompactLayout()) {
      dom.chatPanel.classList.add('chat-panel--hidden');
    } else {
      dom.chatPanel.classList.remove('chat-panel--hidden');
    }
    dom.messagesLayout?.classList.remove('messages-layout--detail');
    if (dom.chatTitle) {
      dom.chatTitle.textContent = 'Sélectionnez une conversation';
    }
    if (dom.chatSubtitle) {
      dom.chatSubtitle.textContent = 'Vos messages apparaîtront ici.';
    }
    if (dom.chatAdThumb) {
      dom.chatAdThumb.hidden = true;
    }
    if (dom.chatDelete) {
      dom.chatDelete.hidden = true;
      dom.chatDelete.disabled = true;
    }
    dom.chatBanner?.setAttribute('hidden', 'true');
    syncLayoutMode();
    updateVoiceUi();
    updateCallButtonVisibility();
  }

  function dismissSecurityBanner() {
    state.dismissedBanner = true;
    localStorage.setItem('mm-chat-security-dismissed', '1');
    dom.chatBanner?.setAttribute('hidden', 'true');
  }

  function renderMessages(conversationId) {
    if (!dom.chatMessages) return;
    dom.chatMessages.classList.remove('is-loading');

    const messages = state.messagesByConversation.get(conversationId) || [];
    if (!messages.length) {
      hideLoadMoreButton();
      dom.chatMessages.innerHTML =
        '<div class="chat-panel__empty">Commencez la discussion avec un premier message.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    if (dom.loadMoreButton) {
      const pagination = state.messagesPagination.get(conversationId);
      const hasMore = Boolean(pagination?.hasMore);
      if (hasMore) {
        dom.loadMoreButton.removeAttribute('hidden');
        dom.loadMoreButton.disabled = loadingOlderMessages;
        dom.loadMoreButton.textContent = loadingOlderMessages ? 'Chargement…' : 'Charger plus';
      } else {
        hideLoadMoreButton();
      }
      fragment.appendChild(dom.loadMoreButton);
    }
    messages.forEach((message) => {
      fragment.appendChild(createMessageElement(message));
    });
    dom.chatMessages.replaceChildren(fragment);
  }

  function createMessageElement(message) {
    const isMine = message.sender === state.userId;
    const row = document.createElement('div');
    row.className = 'message-row';
    row.dataset.messageId = message.id;
    if (message.clientTempId) {
      row.dataset.clientId = message.clientTempId;
    }
    if (isMine) {
      row.classList.add('message-row--own');
    }
    const statusValue = message.status || 'sent';
    if (statusValue === 'sending') {
      row.classList.add('message-row--pending');
    } else if (statusValue === 'failed') {
      row.classList.add('message-row--error');
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (isMine) bubble.classList.add('message-bubble--own');

    const content = document.createElement('div');
    content.className = 'message-bubble__content';
    renderMessageContent(content, message);
    bubble.appendChild(content);

    if (Array.isArray(message.attachments) && message.attachments.length) {
      const attachments = document.createElement('div');
      attachments.className = 'message-attachments';
      message.attachments.forEach((attachment) => {
        const isImage = attachment.thumbnailUrl || attachment.mime?.startsWith('image/');
        const href = attachment.url || (attachment.key ? `/uploads/chat/${attachment.key}` : null);

        if (isImage) {
          // Pour les images, créer un élément cliquable qui ouvre la visionneuse
          const item = document.createElement('button');
          item.className = 'message-attachment';
          item.type = 'button';
          const thumb =
            attachment.thumbnailUrl ||
            attachment.url ||
            (attachment.key ? `/uploads/chat/${attachment.key}` : null);
          item.innerHTML = `<img src="${encodeURI(
            thumb || ''
          )}" alt="${escapeHtml(attachment.originalName || 'Pièce jointe')}">`;
          item.addEventListener('click', () => {
            openImageViewer(href || thumb);
          });
          attachments.appendChild(item);
        } else {
          // Pour les autres fichiers, garder le lien normal
          const item = document.createElement('a');
          item.className = 'message-attachment';
          if (href) {
            item.href = href;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
          }
          item.textContent = attachment.originalName || 'Pièce jointe';
          attachments.appendChild(item);
        }
      });
      bubble.appendChild(attachments);
    }

    const meta = document.createElement('div');
    meta.className = 'message-bubble__meta';

    const time = document.createElement('time');
    time.className = 'message-bubble__time';
    time.dateTime = message.createdAt.toISOString();
    time.textContent = formatTime(message.createdAt);
    meta.appendChild(time);

    if (isMine) {
      const status = document.createElement('span');
      status.className = 'message-bubble__status';
      renderMessageStatus(status, message);
      meta.appendChild(status);
    }

    bubble.appendChild(meta);

    row.appendChild(bubble);

    return row;
  }

  function renderMessageContent(container, message) {
    if (!container || !message) return;
    const isAudio = (message.type || message.audio ? 'audio' : 'text') === 'audio' && message.audio;
    container.classList.toggle('message-bubble__content--audio', Boolean(isAudio));
    container.innerHTML = '';
    if (isAudio) {
      container.appendChild(createMessageAudioPlayer(message));
      return;
    }
    container.innerHTML = formatMessageText(message.text);
  }

  function createMessageAudioPlayer(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-audio';

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'message-audio__button';
    playButton.setAttribute('aria-label', 'Lire le message audio');
    wrapper.appendChild(playButton);

    const body = document.createElement('div');
    body.className = 'message-audio__body';
    wrapper.appendChild(body);

    const source = resolveAudioSource(message.audio);
    if (!source) {
      wrapper.classList.add('message-audio--error');
      playButton.disabled = true;
      const errorLabel = document.createElement('span');
      errorLabel.className = 'message-audio__error';
      errorLabel.textContent = 'Message audio indisponible';
      body.appendChild(errorLabel);
      return wrapper;
    }

    const providedDuration = Number(message?.audio?.duration);
    const hasDuration = Number.isFinite(providedDuration);
    const estimatedDuration = hasDuration ? providedDuration : MAX_VOICE_DURATION * 0.35;
    wrapper.style.setProperty(
      '--message-audio-width',
      `${computeAudioBubbleWidth(estimatedDuration)}px`
    );

    const track = document.createElement('div');
    track.className = 'message-audio__track';
    const trackProgress = document.createElement('div');
    trackProgress.className = 'message-audio__track-progress';
    track.appendChild(trackProgress);
    body.appendChild(track);

    const times = document.createElement('div');
    times.className = 'message-audio__times';

    const currentTime = document.createElement('span');
    currentTime.className = 'message-audio__time';
    currentTime.textContent = '00:00';
    times.appendChild(currentTime);

    const duration = document.createElement('span');
    duration.className = 'message-audio__duration';
    duration.textContent = hasDuration ? formatDuration(providedDuration) : '--:--';
    times.appendChild(duration);

    body.appendChild(times);

    const audioPlayer = document.createElement('audio');
    audioPlayer.className = 'message-audio__player';
    audioPlayer.preload = 'metadata';
    audioPlayer.controls = false;
    audioPlayer.src = source;
    audioPlayer.tabIndex = -1;
    audioPlayer.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(audioPlayer);

    attachAudioPlayerBehavior({
      wrapper,
      playButton,
      progressBar: trackProgress,
      track,
      currentTimeLabel: currentTime,
      durationLabel: duration,
      audioElement: audioPlayer,
      initialDuration: hasDuration ? providedDuration : null
    });

    return wrapper;
  }

  function attachAudioPlayerBehavior({
    wrapper,
    playButton,
    progressBar,
    track,
    currentTimeLabel,
    durationLabel,
    audioElement,
    initialDuration
  }) {
    if (!audioElement) return;
    let knownDuration = initialDuration;

    const setButtonState = (isPlaying) => {
      wrapper.classList.toggle('is-playing', Boolean(isPlaying));
      playButton?.setAttribute(
        'aria-label',
        isPlaying ? 'Mettre en pause le message audio' : 'Lire le message audio'
      );
    };

    const updateProgress = () => {
      if (!currentTimeLabel || !progressBar) return;
      currentTimeLabel.textContent = formatDuration(audioElement.currentTime || 0);
      const duration = getAudioDuration();
      if (!duration) {
        progressBar.style.width = '0%';
        return;
      }
      const percent = clamp((audioElement.currentTime / duration) * 100, 0, 100);
      progressBar.style.width = `${percent}%`;
    };

    const getAudioDuration = () => {
      if (Number.isFinite(audioElement.duration) && audioElement.duration > 0) {
        knownDuration = audioElement.duration;
      }
      return knownDuration && knownDuration > 0 ? knownDuration : audioElement.duration;
    };

    const ensureDurationLabel = () => {
      const duration = getAudioDuration();
      if (
        durationLabel &&
        duration &&
        (!initialDuration || durationLabel.textContent === '--:--')
      ) {
        durationLabel.textContent = formatDuration(duration);
      }
    };

    const updateVisualWidth = () => {
      if (initialDuration || !wrapper) return;
      const duration = getAudioDuration();
      if (!Number.isFinite(duration) || duration <= 0) return;
      wrapper.style.setProperty('--message-audio-width', `${computeAudioBubbleWidth(duration)}px`);
    };

    playButton?.addEventListener('click', () => {
      if (audioElement.paused) {
        ensureSingleAudioPlayback(audioElement);
        audioElement.play().catch(() => {
          wrapper.classList.add('message-audio--error');
          playButton.disabled = true;
          if (activeAudioPlayer === audioElement) {
            activeAudioPlayer = null;
          }
          setButtonState(false);
        });
      } else {
        audioElement.pause();
      }
    });

    track?.addEventListener('click', (event) => {
      const rect = track.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const duration = getAudioDuration();
      if (!duration || !Number.isFinite(duration)) return;
      audioElement.currentTime = ratio * duration;
      updateProgress();
    });

    audioElement.addEventListener('loadedmetadata', () => {
      ensureDurationLabel();
      updateVisualWidth();
      updateProgress();
    });

    audioElement.addEventListener('timeupdate', () => {
      updateProgress();
    });

    audioElement.addEventListener('play', () => {
      ensureSingleAudioPlayback(audioElement);
      activeAudioPlayer = audioElement;
      setButtonState(true);
    });

    audioElement.addEventListener('pause', () => {
      if (activeAudioPlayer === audioElement) {
        activeAudioPlayer = null;
      }
      setButtonState(false);
    });

    audioElement.addEventListener('ended', () => {
      audioElement.currentTime = 0;
      updateProgress();
      if (activeAudioPlayer === audioElement) {
        activeAudioPlayer = null;
      }
      setButtonState(false);
    });

    audioElement.addEventListener('error', () => {
      wrapper.classList.add('message-audio--error');
      playButton && (playButton.disabled = true);
    });

    updateProgress();
  }

  function ensureSingleAudioPlayback(player) {
    if (activeAudioPlayer && activeAudioPlayer !== player) {
      activeAudioPlayer.pause();
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function computeAudioBubbleWidth(seconds) {
    const minWidth = 180;
    const maxWidth = 320;
    const fallbackSeconds = MAX_VOICE_DURATION * 0.35;
    const safeSeconds = Number.isFinite(seconds) ? seconds : fallbackSeconds;
    const capped = clamp(safeSeconds, 1, MAX_VOICE_DURATION);
    const ratio = capped / MAX_VOICE_DURATION;
    return Math.round(minWidth + (maxWidth - minWidth) * ratio);
  }

  function resolveAudioSource(audio) {
    if (!audio) return '';
    if (audio.url) return audio.url;
    if (audio.key) return `/uploads/chat/audio/${audio.key}`;
    return '';
  }

  function insertMessageIntoActive(message) {
    if (!dom.chatMessages) return;
    const existing = dom.chatMessages.querySelector(`[data-message-id="${message.id}"]`);
    if (existing) {
      updateMessageElement(existing, message);
      return;
    }
    if (message.clientTempId) {
      const pending = dom.chatMessages.querySelector(`[data-client-id="${message.clientTempId}"]`);
      if (pending) {
        pendingMessages.delete(message.clientTempId);
        const previewUrl = pendingAudioUrls.get(message.clientTempId);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          pendingAudioUrls.delete(message.clientTempId);
        }
        updateMessageElement(pending, message);
        pending.dataset.messageId = message.id;
        delete pending.dataset.clientId;
        storeMessage(activeConversationId, message);
        return;
      }
    }
    storeMessage(activeConversationId, message);
    const row = createMessageElement(message);
    dom.chatMessages.appendChild(row);
    scrollMessagesToBottom({ smooth: message.sender === state.userId });
  }

  function storeMessage(conversationId, message) {
    if (!conversationId || !message) return;
    const list = state.messagesByConversation.get(conversationId) || [];
    const index = list.findIndex((item) => {
      if (item.id && message.id && item.id === message.id) return true;
      if (message.clientTempId && item.clientTempId && item.clientTempId === message.clientTempId) {
        return true;
      }
      return false;
    });
    if (index >= 0) {
      list[index] = message;
    } else {
      list.push(message);
    }
    list.sort((a, b) => a.createdAt - b.createdAt);
    state.messagesByConversation.set(conversationId, list);
  }

  function getOldestMessage(conversationId) {
    const list = state.messagesByConversation.get(conversationId) || [];
    return list.length ? list[0] : null;
  }

  function findMessageByRef(reference) {
    if (!reference) return null;
    for (const [conversationId, list] of state.messagesByConversation.entries()) {
      const match = list.find((item) => {
        if (item.id && item.id === reference) return true;
        if (item.clientTempId && item.clientTempId === reference) return true;
        return false;
      });
      if (match) {
        return { conversationId, message: match };
      }
    }
    return null;
  }

  function updateMessageElement(element, message) {
    const statusValue = message.status || 'sent';
    element.classList.toggle('message-row--pending', statusValue === 'sending');
    element.classList.toggle('message-row--error', statusValue === 'failed');
    element.dataset.messageId = message.id;
    const bubble = element.querySelector('.message-bubble');
    if (!bubble) return;
    bubble.classList.toggle('message-bubble--own', message.sender === state.userId);

    const content = bubble.querySelector('.message-bubble__content');
    if (content) {
      renderMessageContent(content, message);
    }

    const attachmentsWrapper = bubble.querySelector('.message-attachments');
    if (attachmentsWrapper) attachmentsWrapper.remove();
    if (Array.isArray(message.attachments) && message.attachments.length) {
      const wrapper = document.createElement('div');
      wrapper.className = 'message-attachments';
      message.attachments.forEach((attachment) => {
        const isImage = attachment.thumbnailUrl || attachment.mime?.startsWith('image/');
        const href = attachment.url || (attachment.key ? `/uploads/chat/${attachment.key}` : null);

        if (isImage) {
          // Pour les images, créer un élément cliquable qui ouvre la visionneuse
          const item = document.createElement('button');
          item.className = 'message-attachment';
          item.type = 'button';
          const thumb =
            attachment.thumbnailUrl ||
            attachment.url ||
            (attachment.key ? `/uploads/chat/${attachment.key}` : null);
          item.innerHTML = `<img src="${encodeURI(
            thumb || ''
          )}" alt="${escapeHtml(attachment.originalName || 'Pièce jointe')}">`;
          item.addEventListener('click', () => {
            openImageViewer(href || thumb);
          });
          wrapper.appendChild(item);
        } else {
          // Pour les autres fichiers, garder le lien normal
          const item = document.createElement('a');
          item.className = 'message-attachment';
          if (href) {
            item.href = href;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
          }
          item.textContent = attachment.originalName || 'Pièce jointe';
          wrapper.appendChild(item);
        }
      });
      bubble.appendChild(wrapper);
    }

    const metaBlock = bubble.querySelector('.message-bubble__meta');
    let status = bubble.querySelector('.message-bubble__status');
    if (message.sender === state.userId) {
      if (!status && metaBlock) {
        status = document.createElement('span');
        status.className = 'message-bubble__status';
        metaBlock.appendChild(status);
      }
      if (status) {
        renderMessageStatus(status, message);
      }
    } else if (status) {
      status.remove();
    }
    const time = bubble.querySelector('.message-bubble__time');
    if (time) {
      time.dateTime = message.createdAt.toISOString();
      time.textContent = formatTime(message.createdAt);
    }
  }

  function updateMessageStatus(messageId, status, at) {
    const lookup = findMessageByRef(messageId);
    if (!lookup) return;
    const { conversationId, message } = lookup;
    const nextStatus = status || message.status || 'sent';
    message.status = nextStatus;

    if (conversationId === activeConversationId && dom.chatMessages) {
      const element =
        dom.chatMessages.querySelector(`[data-message-id="${message.id}"]`) ||
        (message.clientTempId
          ? dom.chatMessages.querySelector(`[data-client-id="${message.clientTempId}"]`)
          : null);
      if (element) {
        updateMessageElement(element, message);
        if (at) {
          const timeElement = element.querySelector('.message-bubble__time');
          if (timeElement) {
            timeElement.dateTime = new Date(at).toISOString();
          }
        }
      }
    }

    const conversation = findConversation(conversationId);
    if (conversation && conversation.lastMessage) {
      const lastRef = conversation.lastMessage.id || conversation.lastMessage.clientTempId;
      const messageRef = message.id || message.clientTempId;
      if (lastRef && messageRef && lastRef === messageRef) {
        updateConversationPreview(conversationId, message);
        renderConversations();
      }
    }
  }

  function updateConversationPreview(conversationId, message) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    const preview = getMessagePreview(message);
    conversation.lastMessage = {
      id: message.id,
      sender: message.sender,
      status: message.status || null,
      createdAt: message.createdAt,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      text: message.text || '',
      type: message.type || (message.audio ? 'audio' : 'text'),
      audio: message.audio || null
    };
    conversation.lastMessagePreview = preview;
    conversation.lastMessageAt = message.createdAt;
  }

  function markConversationAsRead(conversationId, options = {}) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    const shouldSync = options?.syncServer !== false;
    const hadUnread = conversation.unreadCount > 0;
    if (hadUnread) {
      conversation.unreadCount = 0;
      if (state.conversationsLoaded) {
        state.unreadTotal = Math.max(0, state.unreadTotal - 1);
      } else {
        refreshUnreadCountFromServer();
      }
      updateUnreadBadge();
      renderConversations();
    }
    if (shouldSync && hadUnread) {
      syncConversationRead(conversationId);
    }
  }

  async function syncConversationRead(conversationId) {
    if (!conversationId || pendingRemoteRead.has(conversationId)) return;
    pendingRemoteRead.add(conversationId);
    try {
      await apiFetch(`/chat/conversations/${conversationId}/read`, { method: 'POST' });
    } catch (error) {
      console.warn('[chat] sync read failed', error);
    } finally {
      pendingRemoteRead.delete(conversationId);
    }
  }

  function incrementConversationUnread(conversationId) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    const wasUnread = conversation.unreadCount > 0;
    conversation.unreadCount += 1;
    if (!wasUnread) {
      if (state.conversationsLoaded) {
        state.unreadTotal += 1;
      } else {
        refreshUnreadCountFromServer();
      }
    }
    updateUnreadBadge();
    renderConversations();
  }

  function moveConversationToTop(conversationId) {
    const index = state.conversations.findIndex((c) => c.id === conversationId);
    if (index <= 0) return;
    const [conversation] = state.conversations.splice(index, 1);
    state.conversations.unshift(conversation);
  }

  function handleAdThumbClick() {
    if (!activeConversationId) return;
    const conversation = findConversation(activeConversationId);
    if (!conversation?.ad) return;
    const fallback = buildAdFallbackFromConversation(conversation);
    const adIdRaw = conversation.ad.id || conversation.adId || fallback?.id;
    const adId = adIdRaw ? String(adIdRaw) : null;

    if (typeof window.openDetailsById === 'function' && adId) {
      window.openDetailsById(adId, fallback);
      return;
    }

    if (typeof window.openDetailsModal === 'function') {
      window.openDetailsModal(fallback || conversation.ad);
    } else {
      console.warn("openDetailsModal n'est pas disponible");
    }
  }

  function handleBackToList() {
    activeConversationId = null;
    state.activeParticipantAvatar = null;
    highlightSelectedConversation('');
    hideTypingIndicator();
    clearComposerAttachments();
    hideChatPanel();
  }

  async function handleHideConversation() {
    if (!activeConversationId || !dom.chatDelete) return;
    dom.chatDelete.disabled = true;
    const conversation = findConversation(activeConversationId);
    try {
      await apiFetch(`/chat/conversations/${activeConversationId}/hide`, { method: 'POST' });
      state.conversations = state.conversations.filter((c) => c.id !== activeConversationId);
      state.filteredConversations = state.filteredConversations.filter(
        (c) => c.id !== activeConversationId
      );
      state.messagesByConversation.delete(activeConversationId);
      state.messagesPagination.delete(activeConversationId);
      if (conversation?.unreadCount > 0) {
        if (state.conversationsLoaded) {
          state.unreadTotal = Math.max(0, state.unreadTotal - 1);
        } else {
          refreshUnreadCountFromServer();
        }
      }
      activeConversationId = null;
      state.activeParticipantAvatar = null;
      hideChatPanel();
      applySearch();
      updateUnreadBadge();
      if (typeof window.showToast === 'function') {
        window.showToast('Conversation supprimée de votre messagerie.');
      }
    } catch (error) {
      console.warn('[chat] Impossible de masquer', error);
      let feedback = 'Suppression impossible, réessayez.';
      if (error?.status === 403) {
        feedback = 'Vous ne pouvez pas masquer cette conversation.';
        dom.chatDelete.hidden = true;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(feedback);
      }
    } finally {
      if (!dom.chatDelete.hidden) {
        dom.chatDelete.disabled = false;
      }
    }
  }

  async function handleLoadOlderMessages() {
    if (!activeConversationId || !dom.chatMessages || loadingOlderMessages) return;
    const pagination = state.messagesPagination.get(activeConversationId);
    if (!pagination?.hasMore) return;
    const oldest = getOldestMessage(activeConversationId);
    if (!oldest?.createdAt) return;
    const conversationId = activeConversationId;
    const previousHeight = dom.chatMessages.scrollHeight;
    const previousTop = dom.chatMessages.scrollTop;
    loadingOlderMessages = true;
    if (dom.loadMoreButton) {
      dom.loadMoreButton.disabled = true;
      dom.loadMoreButton.textContent = 'Chargement…';
    }
    const loaded = await loadOlderMessages(conversationId, oldest.createdAt);
    loadingOlderMessages = false;
    if (dom.loadMoreButton) {
      dom.loadMoreButton.disabled = false;
      dom.loadMoreButton.textContent = 'Charger plus';
    }
    if (!loaded || activeConversationId !== conversationId || !dom.chatMessages) {
      return;
    }
    const newHeight = dom.chatMessages.scrollHeight;
    dom.chatMessages.scrollTop = newHeight - previousHeight + previousTop;
  }

  function handleTextareaInput() {
    if (!dom.chatTextarea || !dom.chatSend) return;
    const text = dom.chatTextarea.value || '';
    if (text.length >= dom.chatTextarea.maxLength) {
      dom.chatInputNote?.removeAttribute('hidden');
    } else {
      dom.chatInputNote?.setAttribute('hidden', 'true');
    }
    updateSendButtonState();
    notifyTyping();
  }

  function handleAttachClick(event) {
    event.preventDefault();
    if (!dom.chatFileInput || dom.chatAttachButton?.disabled) return;
    dom.chatFileInput.click();
  }

  function handleAttachmentSelection(event) {
    if (!event || !dom.chatFileInput) return;
    const files = Array.from(event.target.files || []);
    dom.chatFileInput.value = '';
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - composerAttachments.length);
    if (availableSlots <= 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(`Limite de ${MAX_ATTACHMENTS} pièces jointes atteinte.`);
      }
      return;
    }

    const queue = files.slice(0, availableSlots);
    queue.reduce((promise, file) => {
      return promise.then(() => uploadAttachmentFile(file));
    }, Promise.resolve());
  }

  function handleAttachmentRemove(event) {
    const button = event.target.closest('[data-attachment-remove]');
    if (!button) return;
    const id = button.getAttribute('data-attachment-remove');
    if (!id) return;
    removeAttachmentById(id);
  }

  function handleMessageActionClick(event) {
    const retryButton = event.target.closest('[data-retry-message]');
    if (retryButton) {
      event.preventDefault();
      const ref = retryButton.getAttribute('data-retry-message');
      if (ref) {
        retryFailedMessage(ref);
      }
    }
  }

  async function uploadAttachmentFile(file) {
    if (!file) return;
    const id = `att-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : null;
    const entry = {
      id,
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      status: 'uploading',
      data: null,
      previewUrl: objectUrl,
      objectUrl,
      error: null
    };
    composerAttachments.push(entry);
    renderComposerAttachments();
    updateSendButtonState();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiFetch('/chat/attachments', { method: 'POST', body: formData });
      const attachment = response?.attachment || response;
      entry.status = 'ready';
      entry.data = {
        ...attachment,
        originalName: attachment?.originalName || entry.name
      };
      entry.previewUrl =
        attachment?.thumbnailUrl || attachment?.url || entry.previewUrl || ATTACHMENT_PLACEHOLDER;
      if (entry.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
        entry.objectUrl = null;
      }
    } catch (error) {
      console.error('[chat] Téléversement pièce jointe impossible', error);
      entry.status = 'error';
      entry.error = error.message || 'Échec du téléversement';
      if (typeof window.showToast === 'function') {
        window.showToast('Le téléversement a échoué. Réessayez.');
      }
    } finally {
      renderComposerAttachments();
      updateSendButtonState();
    }
  }

  function removeAttachmentById(id) {
    const index = composerAttachments.findIndex((att) => att.id === id);
    if (index === -1) return;
    const [entry] = composerAttachments.splice(index, 1);
    if (entry?.objectUrl) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    renderComposerAttachments();
    updateSendButtonState();
  }

  function renderComposerAttachments() {
    if (!dom.chatAttachmentPreview) return;
    dom.chatAttachmentPreview.innerHTML = '';
    if (!composerAttachments.length) {
      dom.chatAttachmentPreview.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();
    composerAttachments.forEach((entry) => {
      const chip = document.createElement('div');
      chip.className = 'chat-attachment-chip';
      chip.dataset.attachmentId = entry.id;
      if (entry.status === 'uploading') chip.classList.add('chat-attachment-chip--uploading');
      if (entry.status === 'error') chip.classList.add('chat-attachment-chip--error');

      const thumb = document.createElement('img');
      thumb.className = 'chat-attachment-chip__thumb';
      thumb.alt = '';
      const previewSrc =
        entry.previewUrl || entry.data?.thumbnailUrl || entry.data?.url || ATTACHMENT_PLACEHOLDER;
      thumb.src = previewSrc;
      chip.appendChild(thumb);

      const name = document.createElement('span');
      name.className = 'chat-attachment-chip__name';
      name.textContent = entry.name || 'Pièce jointe';
      chip.appendChild(name);

      const meta = document.createElement('span');
      meta.className = 'chat-attachment-chip__meta';
      if (entry.status === 'uploading') {
        meta.textContent = 'Téléversement…';
      } else if (entry.status === 'error') {
        meta.textContent = entry.error || 'Échec du téléversement';
      } else {
        meta.textContent = formatFileSize(entry.size);
      }
      chip.appendChild(meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chat-attachment-chip__remove';
      remove.setAttribute('data-attachment-remove', entry.id);
      remove.setAttribute('aria-label', 'Retirer la pièce jointe');
      remove.innerHTML = getIconMarkup('close');
      if (entry.status === 'uploading') {
        remove.title = 'Annuler le téléversement';
      }
      chip.appendChild(remove);

      fragment.appendChild(chip);
    });

    dom.chatAttachmentPreview.appendChild(fragment);
    dom.chatAttachmentPreview.hidden = false;
  }

  function getReadyAttachments() {
    return composerAttachments
      .filter((entry) => entry.status === 'ready' && entry.data)
      .map((entry) => ({ ...entry.data }));
  }

  function hasUploadingAttachments() {
    return composerAttachments.some((entry) => entry.status === 'uploading');
  }

  function updateSendButtonState() {
    if (!dom.chatSend) return;
    const textValue = (dom.chatTextarea?.value || '').trim();
    const hasText = textValue.length > 0;
    const hasReady = composerAttachments.some((entry) => entry.status === 'ready');
    const uploading = hasUploadingAttachments();
    dom.chatSend.disabled = uploading || (!hasText && !hasReady);
    if (dom.chatAttachButton) {
      dom.chatAttachButton.disabled = composerAttachments.length >= MAX_ATTACHMENTS || uploading;
    }
  }

  function clearComposerAttachments() {
    composerAttachments.forEach((entry) => {
      if (entry?.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    });
    composerAttachments = [];
    renderComposerAttachments();
    updateSendButtonState();
  }

  function setupVoiceRecorderControls() {
    if (!dom.chatVoiceBtn) return;
    state.voiceSupported = isVoiceRecordingSupported();
    if (!state.voiceSupported) {
      dom.chatVoiceBtn.disabled = true;
      dom.chatVoiceBtn.title = 'Messages vocaux non supportés sur ce navigateur.';
      dom.chatVoiceBtn.classList.add('chat-panel__voice--disabled');
      return;
    }
    dom.chatVoiceBtn.addEventListener('click', handleVoiceButtonClick);
    dom.chatVoiceCancel?.addEventListener('click', cancelVoiceRecording);
    updateVoiceUi();
  }

  function isVoiceRecordingSupported() {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.MediaRecorder === 'function' &&
        navigator?.mediaDevices?.getUserMedia
      );
    } catch (_error) {
      return false;
    }
  }

  async function handleVoiceButtonClick(event) {
    event?.preventDefault();
    if (voiceState.uploading) {
      return;
    }
    if (voiceState.recording) {
      stopVoiceRecording();
      return;
    }
    if (!activeConversationId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Sélectionnez une conversation avant de démarrer un vocal.');
      }
      return;
    }
    await startVoiceRecording();
  }

  async function startVoiceRecording() {
    if (!state.voiceSupported || voiceState.recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {};
      const preferred = getPreferredAudioMimeType();
      if (preferred) {
        options.mimeType = preferred;
      }
      const recorder = new MediaRecorder(stream, options);
      voiceState.stream = stream;
      voiceState.recorder = recorder;
      voiceState.chunks = [];
      voiceState.conversationId = activeConversationId;
      voiceState.startedAt = Date.now();
      voiceState.mimeType = recorder.mimeType || preferred || '';
      voiceState.discardNext = false;
      voiceState.lastDuration = null;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size) {
          voiceState.chunks.push(event.data);
        }
      });
      recorder.addEventListener('stop', handleRecorderStop);
      recorder.start();
      voiceState.recording = true;
      showVoiceStatus();
      updateVoiceUi();
      voiceState.timerId = window.setInterval(() => {
        updateVoiceTimer();
        if (getRecordingDuration() >= MAX_VOICE_DURATION) {
          stopVoiceRecording();
        }
      }, 200);
    } catch (error) {
      console.error('[chat] Impossible de démarrer l’enregistrement vocal', error);
      if (typeof window.showToast === 'function') {
        window.showToast("Le micro n'est pas accessible.");
      }
      cleanupVoiceRecorder();
    }
  }

  function stopVoiceRecording({ discard = false } = {}) {
    if (!voiceState.recorder) {
      cleanupVoiceRecorder();
      return;
    }
    voiceState.discardNext = discard;
    voiceState.lastDuration = getRecordingDuration();
    try {
      if (voiceState.recorder.state !== 'inactive') {
        voiceState.recorder.stop();
      } else {
        handleRecorderStop();
      }
    } catch (error) {
      console.warn('[chat] Stop recorder error', error);
      cleanupVoiceRecorder();
    }
  }

  function cancelVoiceRecording(event) {
    event?.preventDefault();
    if (voiceState.recording) {
      stopVoiceRecording({ discard: true });
    }
  }

  async function handleRecorderStop() {
    if (voiceState.timerId) {
      window.clearInterval(voiceState.timerId);
      voiceState.timerId = null;
    }
    const chunks = [...voiceState.chunks];
    const duration = voiceState.lastDuration || getRecordingDuration();
    const mimeType = voiceState.mimeType;
    const discard = voiceState.discardNext;
    const targetConversationId = voiceState.conversationId;
    cleanupVoiceRecorder();
    if (discard || !chunks.length) {
      return;
    }
    const blob = new Blob(chunks, {
      type: mimeType || (chunks[0] && chunks[0].type) || 'audio/webm'
    });
    await sendVoiceMessage(blob, duration, targetConversationId);
  }

  function cleanupVoiceRecorder() {
    if (voiceState.timerId) {
      window.clearInterval(voiceState.timerId);
      voiceState.timerId = null;
    }
    if (voiceState.stream) {
      voiceState.stream.getTracks().forEach((track) => track.stop());
    }
    if (voiceState.recorder) {
      try {
        voiceState.recorder.removeEventListener('stop', handleRecorderStop);
      } catch (_error) {
        // ignore
      }
    }
    voiceState.recorder = null;
    voiceState.stream = null;
    voiceState.chunks = [];
    voiceState.recording = false;
    voiceState.startedAt = null;
    voiceState.mimeType = null;
    voiceState.discardNext = false;
    voiceState.lastDuration = null;
    voiceState.conversationId = null;
    hideVoiceStatus();
    updateVoiceUi();
  }

  function updateVoiceUi() {
    if (!dom.chatVoiceBtn) return;
    const disabled = !state.voiceSupported || voiceState.uploading || !activeConversationId;
    dom.chatVoiceBtn.disabled = disabled;
    dom.chatVoiceBtn.setAttribute('aria-pressed', voiceState.recording ? 'true' : 'false');
    if (voiceState.recording) {
      dom.chatVoiceBtn.classList.add('chat-panel__voice--recording');
      dom.chatVoiceBtn.setAttribute('aria-label', 'Arrêter le message vocal');
      showVoiceStatus();
    } else {
      dom.chatVoiceBtn.classList.remove('chat-panel__voice--recording');
      dom.chatVoiceBtn.setAttribute('aria-label', 'Enregistrer un message vocal');
    }
    if (voiceState.uploading) {
      dom.chatVoiceBtn.classList.add('chat-panel__voice--uploading');
    } else {
      dom.chatVoiceBtn.classList.remove('chat-panel__voice--uploading');
    }
  }

  function showVoiceStatus() {
    if (!dom.chatVoiceStatus) return;
    dom.chatVoiceStatus.hidden = false;
    updateVoiceTimer();
  }

  function hideVoiceStatus() {
    if (!dom.chatVoiceStatus) return;
    dom.chatVoiceStatus.hidden = true;
    updateVoiceTimerDisplay('00:00');
  }

  function updateVoiceTimer() {
    const duration = getRecordingDuration();
    updateVoiceTimerDisplay(formatDuration(duration));
  }

  function updateVoiceTimerDisplay(value) {
    if (dom.chatVoiceTimer) {
      dom.chatVoiceTimer.textContent = value;
    }
  }

  function getRecordingDuration() {
    if (!voiceState.recording || !voiceState.startedAt) return 0;
    return Math.max(0, (Date.now() - voiceState.startedAt) / 1000);
  }

  function getPreferredAudioMimeType() {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      return null;
    }
    return VOICE_MIME_CANDIDATES.find((candidate) => {
      try {
        return window.MediaRecorder.isTypeSupported(candidate);
      } catch (_error) {
        return false;
      }
    });
  }

  async function uploadVoiceBlob(blob, { duration } = {}) {
    const formData = new FormData();
    const filename = `voice-${Date.now()}.webm`;
    formData.append('file', blob, filename);
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      formData.append('duration', duration);
    }
    return apiFetch('/chat/audio', { method: 'POST', body: formData });
  }

  async function sendVoiceMessage(blob, durationSeconds, targetConversationId) {
    const conversationId = targetConversationId || activeConversationId;
    if (!conversationId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Conversation introuvable pour ce message vocal.');
      }
      return;
    }
    voiceState.uploading = true;
    updateVoiceUi();
    const clientTempId = `tmp-audio-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(blob)
        : null;
    if (objectUrl) {
      pendingAudioUrls.set(clientTempId, objectUrl);
    }
    const duration = Number.isFinite(durationSeconds)
      ? Math.max(0, Math.round(durationSeconds * 10) / 10)
      : null;
    const pending = {
      id: clientTempId,
      clientTempId,
      conversationId,
      sender: state.userId,
      recipient: null,
      text: '',
      type: 'audio',
      audio: {
        key: clientTempId,
        url: objectUrl,
        mime: blob.type || 'audio/webm',
        size: blob.size,
        duration
      },
      attachments: [],
      status: 'sending',
      createdAt: new Date()
    };
    appendPendingMessage(pending);
    try {
      const uploadResponse = await uploadVoiceBlob(blob, { duration });
      const audioMeta = uploadResponse?.audio || uploadResponse;
      pending.audio = audioMeta;
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          type: 'audio',
          audio: audioMeta,
          text: '',
          attachments: [],
          clientTempId
        }
      });
      const savedMessage = data?.message ? enhanceMessage(data.message) : null;
      if (savedMessage) {
        insertMessageIntoActive(savedMessage);
        updateConversationPreview(conversationId, savedMessage);
        moveConversationToTop(conversationId);
        applySearch();
      }
    } catch (error) {
      console.error('[chat] Envoi du vocal impossible', error);
      pending.status = 'failed';
      storeMessage(conversationId, pending);
      if (conversationId === activeConversationId && dom.chatMessages) {
        const element = pendingMessages.get(clientTempId);
        if (element) {
          updateMessageElement(element, pending);
        }
      }
      updateConversationPreview(conversationId, pending);
      renderConversations();
      if (typeof window.showToast === 'function') {
        window.showToast('Message vocal non envoyé.');
      }
    } finally {
      voiceState.uploading = false;
      updateVoiceUi();
      const previewUrl = pendingAudioUrls.get(clientTempId);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        pendingAudioUrls.delete(clientTempId);
      }
    }
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} o`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} Ko`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} Mo`;
  }

  function appendPendingMessage(pending) {
    if (!pending || !pending.conversationId) return;
    storeMessage(pending.conversationId, pending);
    let row = null;
    if (dom.chatMessages && pending.conversationId === activeConversationId) {
      row = createMessageElement(pending);
      dom.chatMessages.appendChild(row);
      scrollMessagesToBottom({ smooth: true });
    }
    if (row && pending.clientTempId) {
      pendingMessages.set(pending.clientTempId, row);
    }
    updateConversationPreview(pending.conversationId, pending);
    moveConversationToTop(pending.conversationId);
    applySearch();
  }

  async function handleSendMessage() {
    if (!dom.chatTextarea || !activeConversationId) return;
    const originalValue = dom.chatTextarea.value;
    const text = originalValue.trim();
    const attachmentsPayload = getReadyAttachments();

    if (!text && !attachmentsPayload.length) {
      return;
    }
    if (hasUploadingAttachments()) {
      if (typeof window.showToast === 'function') {
        window.showToast('Patientez, téléversement en cours…');
      }
      return;
    }

    dom.chatTextarea.value = '';
    updateSendButtonState();

    const clientTempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const pending = {
      id: clientTempId,
      clientTempId,
      conversationId: activeConversationId,
      sender: state.userId,
      type: 'text',
      audio: null,
      text,
      attachments: attachmentsPayload.map((attachment) => ({ ...attachment })),
      status: 'sending',
      createdAt: new Date()
    };
    appendPendingMessage(pending);

    try {
      const data = await apiFetch(`/chat/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        body: { text, attachments: attachmentsPayload, clientTempId, type: 'text' }
      });
      const savedMessage = data?.message ? enhanceMessage(data.message) : null;
      if (savedMessage) {
        insertMessageIntoActive(savedMessage);
        updateConversationPreview(activeConversationId, savedMessage);
        moveConversationToTop(activeConversationId);
        applySearch();
        clearComposerAttachments();
      }
    } catch (error) {
      console.error('[chat] Envoi impossible', error);
      pending.status = 'failed';
      storeMessage(activeConversationId, pending);
      const element = pendingMessages.get(clientTempId);
      if (element) {
        updateMessageElement(element, pending);
      }
      updateConversationPreview(activeConversationId, pending);
      renderConversations();
      dom.chatTextarea.value = originalValue;
      if (typeof window.showToast === 'function') {
        window.showToast('Message non envoyé.');
      }
    } finally {
      pendingMessages.delete(clientTempId);
      updateSendButtonState();
    }
  }

  async function retryFailedMessage(reference) {
    const lookup = findMessageByRef(reference);
    if (!lookup) return;
    const { conversationId, message } = lookup;
    if (!message || message.status !== 'failed') return;
    const payload = {
      text: message.text,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      clientTempId: message.clientTempId || reference,
      type: message.type || 'text'
    };
    if (payload.type === 'audio' && message.audio) {
      payload.audio = message.audio;
    }
    message.status = 'sending';
    storeMessage(conversationId, message);
    updateConversationPreview(conversationId, message);
    renderConversations();

    if (conversationId === activeConversationId && dom.chatMessages) {
      const row =
        dom.chatMessages.querySelector(`[data-message-id="${message.id}"]`) ||
        (message.clientTempId
          ? dom.chatMessages.querySelector(`[data-client-id="${message.clientTempId}"]`)
          : null);
      if (row) {
        updateMessageElement(row, message);
        pendingMessages.set(payload.clientTempId, row);
      }
    }

    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: payload
      });
      const savedMessage = data?.message ? enhanceMessage(data.message) : null;
      if (savedMessage) {
        if (conversationId === activeConversationId) {
          insertMessageIntoActive(savedMessage);
        } else {
          storeMessage(conversationId, savedMessage);
        }
        updateConversationPreview(conversationId, savedMessage);
        moveConversationToTop(conversationId);
        applySearch();
      }
    } catch (error) {
      console.error('[chat] Réessai d’envoi impossible', error);
      message.status = 'failed';
      storeMessage(conversationId, message);
      if (conversationId === activeConversationId && dom.chatMessages) {
        const row =
          dom.chatMessages.querySelector(`[data-message-id="${message.id}"]`) ||
          (message.clientTempId
            ? dom.chatMessages.querySelector(`[data-client-id="${message.clientTempId}"]`)
            : null);
        if (row) {
          updateMessageElement(row, message);
        }
      }
      updateConversationPreview(conversationId, message);
      renderConversations();
      if (typeof window.showToast === 'function') {
        window.showToast('Message non envoyé.');
      }
    } finally {
      pendingMessages.delete(payload.clientTempId);
    }
  }

  function joinConversation(conversationId, { markAsRead = false } = {}) {
    if (!conversationId) return;
    ensureSocket();
    const alreadySubscribed = subscribedConversationIds.has(conversationId);
    subscribedConversationIds.add(conversationId);
    if (!socket?.connected) return;
    if (alreadySubscribed && !markAsRead) return;
    socket.emit('conversation:join', { conversationId, markAsRead });
  }

  function scheduleMarkRead(messageId) {
    if (!activeConversationId) return;
    pendingRead.add(messageId);
    if (readFlushTimer) return;
    readFlushTimer = window.setTimeout(flushMarkRead, 400);
  }

  function flushMarkRead() {
    if (!pendingRead.size || !activeConversationId) {
      readFlushTimer = null;
      return;
    }
    const ids = Array.from(pendingRead);
    pendingRead.clear();
    readFlushTimer = null;
    socket?.emit('messages:markRead', { conversationId: activeConversationId, messageIds: ids });
  }

  function notifyTyping() {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:start', { conversationId: activeConversationId });
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversationId });
    }, 2200);
  }

  function showTypingIndicator(conversationId) {
    if (!dom.typingIndicator || !dom.chatMessages) return;
    window.clearTimeout(typingIndicatorHideTimer);
    typingIndicatorHideTimer = null;

    const conversation = conversationId ? findConversation(conversationId) : null;
    const name = conversation?.otherParticipant?.name || 'Votre interlocuteur';
    if (dom.typingIndicatorText) {
      dom.typingIndicatorText.textContent = `${name} est en train d'écrire…`;
    }
    if (dom.typingIndicatorAvatar) {
      const image = conversation?.otherParticipant?.avatar || state.activeParticipantAvatar || null;
      dom.typingIndicatorAvatar.style.removeProperty('background-image');
      dom.typingIndicatorAvatar.classList.remove('has-image');
      dom.typingIndicatorAvatar.textContent = '';
      if (image) {
        dom.typingIndicatorAvatar.style.backgroundImage = `url('${encodeURI(image)}')`;
        dom.typingIndicatorAvatar.classList.add('has-image');
      } else {
        const initial = (name || '').trim().charAt(0).toUpperCase() || '•';
        dom.typingIndicatorAvatar.textContent = initial;
      }
    }

    if (dom.typingIndicatorWrapper) {
      dom.chatMessages.appendChild(dom.typingIndicatorWrapper);
    } else if (!dom.typingIndicator.isConnected) {
      dom.chatMessages.appendChild(dom.typingIndicator);
    }

    dom.typingIndicator.dataset.conversationId = conversationId || '';
    dom.typingIndicator.classList.add('is-visible');
    dom.typingIndicator.removeAttribute('hidden');
  }

  function hideTypingIndicator(options = {}) {
    if (!dom.typingIndicator) return;
    const delay =
      typeof options.delay === 'number' && options.delay > 0 ? Math.min(options.delay, 1000) : 0;
    window.clearTimeout(typingIndicatorHideTimer);
    if (delay) {
      typingIndicatorHideTimer = window.setTimeout(() => {
        typingIndicatorHideTimer = null;
        removeTypingIndicator();
      }, delay);
      return;
    }
    removeTypingIndicator();
  }

  function removeTypingIndicator() {
    if (!dom.typingIndicator) return;
    dom.typingIndicator.classList.remove('is-visible');
    dom.typingIndicator.setAttribute('hidden', 'true');
    dom.typingIndicator.dataset.conversationId = '';
    if (dom.typingIndicatorAvatar) {
      dom.typingIndicatorAvatar.style.removeProperty('background-image');
      dom.typingIndicatorAvatar.classList.remove('has-image');
      dom.typingIndicatorAvatar.textContent = '';
    }
    if (dom.typingIndicatorWrapper) {
      dom.typingIndicatorWrapper.remove();
    } else {
      dom.typingIndicator.remove();
    }
  }

  function handleSearchInput(event) {
    state.searchTerm = event.target.value || '';
    updateSearchClearButton();
    scheduleSearchFilter();
  }

  function handleSearchClear() {
    if (!dom.searchInput) return;
    dom.searchInput.value = '';
    state.searchTerm = '';
    updateSearchClearButton();
    scheduleSearchFilter();
    dom.searchInput.focus();
  }

  function updateSearchClearButton() {
    if (!dom.searchClear) return;
    const hasValue = Boolean(state.searchTerm && state.searchTerm.trim().length);
    if (hasValue) {
      dom.searchClear.removeAttribute('hidden');
    } else {
      dom.searchClear.setAttribute('hidden', 'true');
    }
  }

  function scrollMessagesToBottom({ smooth = true, force = false } = {}) {
    if (!dom.chatMessages) return;
    const alreadyBottom =
      dom.chatMessages.scrollHeight - dom.chatMessages.scrollTop - dom.chatMessages.clientHeight <
      60;
    if (!force && alreadyBottom) return;
    dom.chatMessages.scrollTo({
      top: dom.chatMessages.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function updateUnreadBadge() {
    const computed =
      typeof state.unreadTotal === 'number' ? state.unreadTotal : countUnreadConversations();
    const total = Math.max(0, computed);
    const formatted = total > 99 ? '99+' : String(total);
    if (dom.messagesUnreadBadge) {
      if (total > 0) {
        dom.messagesUnreadBadge.textContent = formatted;
        dom.messagesUnreadBadge.style.display = 'inline-flex';
      } else {
        dom.messagesUnreadBadge.textContent = '';
        dom.messagesUnreadBadge.style.display = 'none';
      }
    }
    if (dom.navMessagesBadge) {
      if (total > 0) {
        dom.navMessagesBadge.textContent = formatted;
        dom.navMessagesBadge.removeAttribute('hidden');
      } else {
        dom.navMessagesBadge.textContent = '';
        dom.navMessagesBadge.setAttribute('hidden', 'true');
      }
    }
    const navMessages = dom.openTop || document.getElementById('navMessages');
    if (navMessages) {
      if (total > 0) {
        navMessages.setAttribute('data-unread', 'true');
      } else {
        navMessages.removeAttribute('data-unread');
      }
    }
  }

  function countUnreadConversations(list = state.conversations) {
    return list.reduce((acc, conversation) => acc + (conversation.unreadCount > 0 ? 1 : 0), 0);
  }

  function formatMessageText(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    return escaped.replace(/\n/g, '<br>');
  }

  function getMessagePreview(message) {
    if (!message) return '';
    if ((message.type === 'audio' || message.audio) && message.audio) {
      const duration = message.audio.duration;
      return duration ? `Message vocal · ${formatDuration(duration)}` : 'Message vocal';
    }
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (text) return text;
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length === 0) {
      return 'Nouveau message';
    }
    if (attachments.length === 1) {
      const name = attachments[0]?.originalName?.trim();
      return name ? `Pièce jointe · ${name}` : 'Pièce jointe';
    }
    return `${attachments.length} pièces jointes`;
  }

  function formatStatus(status) {
    switch (status) {
      case 'read':
        return 'Lu';
      case 'delivered':
        return 'Reçu';
      case 'sending':
        return 'Envoi…';
      case 'failed':
        return 'Échec';
      case 'sent':
      default:
        return 'Envoyé';
    }
  }

  function getStatusDisplay(status) {
    const value = status || 'sent';
    switch (value) {
      case 'sending':
        return { label: formatStatus(value), icon: 'spinner', spinner: true };
      case 'failed':
        return { label: formatStatus(value), icon: 'alert', spinner: false };
      case 'delivered':
        return { label: formatStatus(value), icon: 'check-double', spinner: false };
      case 'read':
        return { label: formatStatus(value), icon: 'check-double', spinner: false };
      case 'sent':
      default:
        return { label: formatStatus(value), icon: 'check', spinner: false };
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function formatRelativeTime(date) {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.round(diff / (60 * 1000));
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.round(diff / (60 * 60 * 1000));
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    if (days <= 7) return `Il y a ${days} j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function handleConversationStartedEvent(event) {
    const detail = event?.detail;
    const rawConversation = detail?.conversation || detail;
    if (!rawConversation) {
      loadConversations({ force: true });
      return;
    }
    const conversation = enhanceConversation(rawConversation);
    upsertConversation(conversation);
    joinConversation(conversation.id);
    applySearch();
    updateUnreadBadge();

    const shouldOpen =
      dom.modal?.classList.contains('mm-open') || detail?.autoOpen || detail?.created;
    pendingSelectConversationId = conversation.id;
    if (shouldOpen) {
      openModal({ conversationId: conversation.id });
      selectConversationIfAvailable(conversation.id);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function apiFetch(path, { method = 'GET', body, headers, query } = {}) {
    const url = buildUrl(path, query);
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const requestHeaders = isFormData
      ? headers || {}
      : {
          'Content-Type': 'application/json',
          ...(headers || {})
        };
    const requestInit = {
      method,
      credentials: 'include',
      headers: requestHeaders
    };
    if (body) {
      requestInit.body = isFormData ? body : JSON.stringify(body);
    }
    const response = await fetch(url, requestInit);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || payload?.status === 'error') {
      const message = payload?.message || `Erreur HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = payload?.code;
      error.payload = payload;
      throw error;
    }
    return payload?.data ?? payload;
  }

  function buildUrl(path, query) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const segment = path.startsWith('/') ? path : `/${path}`;
    let url = `${base}${segment}`;
    if (query && typeof query === 'object') {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  window.ChatClient = {
    connect: ensureSocket,
    joinConversation,
    leaveConversation: (conversationId) => socket?.emit('conversation:leave', { conversationId }),
    sendMessage: ({
      conversationId,
      text,
      attachments = [],
      type = 'text',
      audio = null,
      clientTempId = null
    }) =>
      apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { text, attachments, type, audio, clientTempId }
      }),
    notifyTyping
  };

  // ==================== VOICE CALL FUNCTIONS ====================

  function setupVoiceCallManager() {
    messagesDebugLog('[Messages] setupVoiceCallManager appelé');
    if (!window.VoiceCallManager) {
      messagesDebugWarn('[VoiceCall] VoiceCallManager non disponible');
      if (typeof window.showToast === 'function') {
        window.showToast('Appels vocaux indisponibles pour le moment.');
      }
      return;
    }

    messagesDebugLog("[Messages] Création d'une nouvelle instance VoiceCallManager");
    voiceCallManager = new window.VoiceCallManager();

    // Référence à l'élément audio distant
    const remoteEl = voiceCallModals.remoteAudio || document.getElementById('voiceCallRemoteAudio');

    // Fonction safePlay pour forcer la lecture après action utilisateur
    const safePlay = () => {
      if (remoteEl?.srcObject) {
        remoteEl.play().catch((e) => {
          messagesDebugWarn('[Messages] safePlay: erreur lecture', e);
        });
      }
    };

    // Configurer les callbacks
    voiceCallManager.onStateChange = handleCallStateChange;
    voiceCallManager.onError = handleCallError;
    voiceCallManager.onCallEnded = handleCallEndedUI;

    // Configurer les boutons du modal
    if (voiceCallModals.answerBtn) {
      voiceCallModals.answerBtn.addEventListener('click', () => {
        voiceCallManager.answerCall();
        safePlay(); // Forcer la lecture après action utilisateur
      });
    }

    if (voiceCallModals.endBtn) {
      voiceCallModals.endBtn.addEventListener('click', () => {
        if (
          voiceCallManager.callState === window.CALL_STATES.RINGING &&
          !voiceCallManager.isInitiator
        ) {
          voiceCallManager.rejectCall();
        } else if (
          voiceCallManager.callState === window.CALL_STATES.RINGING &&
          voiceCallManager.isInitiator
        ) {
          voiceCallManager.cancelCall();
        } else {
          voiceCallManager.endCall();
        }
      });
    }

    if (voiceCallModals.muteBtn) {
      voiceCallModals.muteBtn.addEventListener('click', () => {
        const isMuted = voiceCallManager.toggleMute();
        if (isMuted) {
          voiceCallModals.muteBtn.classList.add('active');
          voiceCallModals.muteBtn.setAttribute('aria-label', 'Activer le micro');
        } else {
          voiceCallModals.muteBtn.classList.remove('active');
          voiceCallModals.muteBtn.setAttribute('aria-label', 'Couper le micro');
        }
      });
    }
  }

  async function handleCallButtonClick() {
    messagesDebugLog(
      '[Messages] handleCallButtonClick appelé, activeConversationId:',
      activeConversationId
    );

    // Empêcher double clic / appel en cours
    if (voiceCallManager && voiceCallManager.isInCall()) {
      messagesDebugWarn('[Messages] Appel déjà en cours, ignorer');
      if (typeof window.showToast === 'function') {
        window.showToast('Un appel est déjà en cours.');
      }
      return;
    }

    if (!activeConversationId) {
      messagesDebugWarn('[Messages] Pas de conversation active');
      if (typeof window.showToast === 'function') {
        window.showToast('Sélectionnez une conversation avant de lancer un appel.');
      }
      return;
    }

    const conversation = findConversation(activeConversationId);
    messagesDebugLog('[Messages] Conversation trouvée:', conversation);
    if (!conversation || !conversation.otherParticipant) {
      console.error('[Messages] Conversation ou participant introuvable');
      if (typeof window.showToast === 'function') {
        window.showToast("Impossible d'identifier l'autre participant.");
      }
      return;
    }

    if (!conversation.voiceCallConsent?.ready) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          'Activez les appels pour vous et votre interlocuteur avant de démarrer un appel.'
        );
      }
      return;
    }

    const remoteUserId = conversation.otherParticipant.id;
    const remoteUsername = conversation.otherParticipant.name || 'Utilisateur';
    const remoteAvatar = conversation.otherParticipant.avatar || '/uploads/avatars/default.jpg';

    messagesDebugLog("[Messages] Préparation de l'appel vers:", {
      remoteUserId,
      remoteUsername,
      conversationId: activeConversationId
    });

    // Initialiser / connecter le socket si nécessaire
    if (!socket) {
      messagesDebugLog('[Messages] Socket non initialisé, appel de ensureSocket()');
      ensureSocket();
    }

    // Attendre connexion effective si pas encore connectée
    // La connexion socket valide l'authentification (cookie HttpOnly)
    if (!socket.connected) {
      messagesDebugLog('[Messages] Attente connexion socket avant appel...');
      const connected = await waitForSocketConnected(socket, 4000).catch(() => false);
      if (!connected) {
        console.error('[Messages] Échec connexion socket avant appel');
        if (typeof window.showToast === 'function') {
          window.showToast('Connexion à la messagerie impossible. Réessayez.');
        }
        return;
      }
    }

    // Si socket connecté, l'authentification est validée côté serveur
    messagesDebugLog('[Messages] Socket connecté, authentification OK');

    // Initialiser le manager avec le socket
    if (!voiceCallManager.socket) {
      messagesDebugLog('[Messages] Initialisation du voiceCallManager avec socket');
      voiceCallManager.init(socket);
    }

    // Mettre à jour l'interface du modal
    if (voiceCallModals.avatar) {
      const img = voiceCallModals.avatar.querySelector('img');
      if (img) img.src = remoteAvatar;
    }
    if (voiceCallModals.username) {
      voiceCallModals.username.textContent = remoteUsername;
    }
    if (voiceCallModals.status) {
      voiceCallModals.status.textContent = 'Appel en cours...';
    }

    // Afficher le modal
    messagesDebugLog("[Messages] Affichage du modal d'appel");
    showVoiceCallModal();

    // Initier l'appel
    messagesDebugLog('[Messages] Appel de voiceCallManager.initiateCall()');
    voiceCallManager.initiateCall(activeConversationId, remoteUserId, remoteUsername);

    // Forcer la lecture après action utilisateur
    safePlay();
  }

  async function handleCallConsentToggle(event) {
    if (!dom.chatCallConsentToggle) return;
    if (!activeConversationId) {
      event.target.checked = false;
      return;
    }
    if (updatingCallConsent) {
      event.preventDefault();
      event.target.checked = !event.target.checked;
      return;
    }
    const allowCalls = Boolean(event.target.checked);
    updatingCallConsent = true;
    dom.chatCallConsent?.classList.add('is-disabled');
    dom.chatCallConsentToggle.disabled = true;
    try {
      const payload = await apiFetch(`/chat/conversations/${activeConversationId}/call-consent`, {
        method: 'POST',
        body: { allowCalls }
      });
      const updatedConversation = payload?.conversation
        ? enhanceConversation(payload.conversation)
        : null;
      if (updatedConversation) {
        upsertConversation(updatedConversation);
        if (updatedConversation.id === activeConversationId) {
          updateCallConsentUi(updatedConversation);
          updateCallButtonVisibility();
        }
        renderConversations();
      }
    } catch (error) {
      event.target.checked = !allowCalls;
      console.error('[Messages] Mise à jour du consentement aux appels impossible', error);
      if (typeof window.showToast === 'function') {
        window.showToast(
          error?.message || "Impossible de mettre à jour votre préférence d'appel vocal."
        );
      }
    } finally {
      updatingCallConsent = false;
      if (dom.chatCallConsent) {
        dom.chatCallConsent.classList.remove('is-disabled');
      }
      if (dom.chatCallConsentToggle) {
        dom.chatCallConsentToggle.disabled = false;
      }
      const conversation = findConversation(activeConversationId);
      updateCallConsentUi(conversation);
    }
  }

  function handleCallConsentEvent(payload = {}) {
    if (!payload?.conversationId) return;
    const conversation = findConversation(payload.conversationId);
    if (!conversation) return;
    const consent = ensureConversationConsent(conversation);
    const rawUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt) : new Date();
    const updatedAt = Number.isNaN(rawUpdatedAt.getTime()) ? null : rawUpdatedAt;
    const userId = payload.userId ? String(payload.userId) : null;
    const isCurrentUser = userId && state.userId && userId === state.userId;
    const target = isCurrentUser ? consent.me : consent.other;
    target.allowed = Boolean(payload.allowCalls);
    target.updatedAt = updatedAt;
    target.updatedBy = userId;
    consent.ready = Boolean(consent.me.allowed && consent.other.allowed);
    if (conversation.id === activeConversationId) {
      updateCallConsentUi(conversation);
      updateCallButtonVisibility();
    }
    renderConversations();
  }

  // Attente utilitaire de connexion socket (résout true/false)
  function waitForSocketConnected(sock, timeout = 5000) {
    return new Promise((resolve) => {
      if (!sock) return resolve(false);
      if (sock.connected) return resolve(true);
      const timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);
      function onConnect() {
        cleanup();
        resolve(true);
      }
      function onError() {
        // connect_error
        cleanup();
        resolve(false);
      }
      function cleanup() {
        clearTimeout(timer);
        sock.off('connect', onConnect);
        sock.off('connect_error', onError);
        sock.off('error', onError);
      }
      sock.on('connect', onConnect);
      sock.on('connect_error', onError);
      sock.on('error', onError);
    });
  }

  function handleCallStateChange(data) {
    const { state, duration, remoteStream, isIncoming, conversationId } = data;

    if (!voiceCallModals.modal) return;

    // Si c'est un appel entrant, mettre à jour les infos de l'appelant
    if (isIncoming && conversationId) {
      const conversation = findConversation(conversationId);
      if (conversation && conversation.otherParticipant) {
        const remoteAvatar = conversation.otherParticipant.avatar || '/uploads/avatars/default.jpg';
        const remoteUsername = conversation.otherParticipant.name || 'Utilisateur';

        if (voiceCallModals.avatar) {
          const img = voiceCallModals.avatar.querySelector('img');
          if (img) img.src = remoteAvatar;
        }
        if (voiceCallModals.username) {
          voiceCallModals.username.textContent = remoteUsername;
        }
      }
    }

    // Gérer l'état
    switch (state) {
      case window.CALL_STATES.IDLE:
        hideVoiceCallModal();
        break;

      case window.CALL_STATES.INITIATING:
        if (voiceCallModals.status) {
          voiceCallModals.status.textContent = 'Initialisation...';
          voiceCallModals.status.classList.remove('ringing');
        }
        if (voiceCallModals.answerBtn) voiceCallModals.answerBtn.hidden = true;
        if (voiceCallModals.muteBtn) voiceCallModals.muteBtn.hidden = true;
        if (voiceCallModals.duration) voiceCallModals.duration.hidden = true;
        if (voiceCallModals.connecting) voiceCallModals.connecting.hidden = false;
        break;

      case window.CALL_STATES.RINGING:
        if (isIncoming) {
          // Appel entrant
          if (voiceCallModals.status) {
            voiceCallModals.status.textContent = 'Appel entrant';
            voiceCallModals.status.classList.add('ringing');
          }
          if (voiceCallModals.answerBtn) voiceCallModals.answerBtn.hidden = false;
          showVoiceCallModal();
        } else {
          // Appel sortant
          if (voiceCallModals.status) {
            voiceCallModals.status.textContent = 'Sonnerie';
            voiceCallModals.status.classList.add('ringing');
          }
          if (voiceCallModals.answerBtn) voiceCallModals.answerBtn.hidden = true;
        }
        if (voiceCallModals.muteBtn) voiceCallModals.muteBtn.hidden = true;
        if (voiceCallModals.duration) voiceCallModals.duration.hidden = true;
        if (voiceCallModals.connecting) voiceCallModals.connecting.hidden = true;
        break;

      case window.CALL_STATES.CONNECTING:
        if (voiceCallModals.status) {
          voiceCallModals.status.textContent = 'Connexion...';
          voiceCallModals.status.classList.remove('ringing');
        }
        if (voiceCallModals.answerBtn) voiceCallModals.answerBtn.hidden = true;
        if (voiceCallModals.muteBtn) voiceCallModals.muteBtn.hidden = true;
        if (voiceCallModals.duration) voiceCallModals.duration.hidden = true;
        if (voiceCallModals.connecting) voiceCallModals.connecting.hidden = false;
        break;

      case window.CALL_STATES.CONNECTED:
        if (voiceCallModals.status) {
          voiceCallModals.status.textContent = 'En ligne';
          voiceCallModals.status.classList.remove('ringing');
        }
        if (voiceCallModals.answerBtn) voiceCallModals.answerBtn.hidden = true;
        if (voiceCallModals.muteBtn) voiceCallModals.muteBtn.hidden = false;
        if (voiceCallModals.duration) voiceCallModals.duration.hidden = false;
        if (voiceCallModals.connecting) voiceCallModals.connecting.hidden = true;

        // Connecter le flux audio distant
        if (remoteStream && voiceCallModals.remoteAudio) {
          const audioEl = voiceCallModals.remoteAudio;

          // S'assurer que les attributs sont corrects
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.muted = false;
          audioEl.volume = 1.0;

          // Attacher le flux
          audioEl.srcObject = remoteStream;

          // Log détaillé
          const tracks = remoteStream.getAudioTracks();
          messagesDebugLog('[Messages][DEBUG] Attachement audio distant:', {
            hasAudioElement: !!audioEl,
            hasSrcObject: !!audioEl.srcObject,
            audioTracks: tracks.length,
            trackEnabled: tracks[0]?.enabled,
            trackMuted: tracks[0]?.muted,
            trackReadyState: tracks[0]?.readyState,
            elementVolume: audioEl.volume,
            elementMuted: audioEl.muted
          });

          // Configurer la sortie audio si disponible
          if (audioEl && 'setSinkId' in audioEl) {
            audioEl.setSinkId('default').catch((e) => {
              messagesDebugWarn('[Messages][DEBUG] setSinkId échoué:', e);
            });
          }

          // Démarrer la lecture
          audioEl
            .play()
            .then(() => {
              messagesDebugLog('[Messages][DEBUG] Lecture audio distante démarrée avec succès');
            })
            .catch((e) => {
              console.warn(
                '[Messages][DEBUG] Impossible de démarrer la lecture audio distante:',
                e
              );
            });
        }
        break;

      case window.CALL_STATES.ENDED:
        hideVoiceCallModal();
        break;
    }

    // Mettre à jour la durée si fournie
    if (duration !== undefined && voiceCallModals.duration) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      voiceCallModals.duration.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  function handleCallError(message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
    }
    console.error('[VoiceCall] Erreur:', message);
  }

  function handleCallEndedUI(data) {
    hideVoiceCallModal();

    const reason = data.reason || 'completed';
    let message = 'Appel terminé';

    switch (reason) {
      case 'rejected':
        message = 'Appel rejeté';
        break;
      case 'cancelled':
        message = 'Appel annulé';
        break;
      case 'timeout':
        message = 'Pas de réponse';
        break;
      case 'network':
        message = 'Problème de connexion';
        break;
      case 'error':
        message = "Erreur lors de l'appel";
        break;
    }

    if (typeof window.showToast === 'function') {
      window.showToast(message);
    }
  }

  function showVoiceCallModal() {
    if (voiceCallModals.modal) {
      voiceCallModals.modal.classList.remove('hidden');
    }
  }

  function hideVoiceCallModal() {
    if (voiceCallModals.modal) {
      voiceCallModals.modal.classList.add('hidden');
    }
    // Réinitialiser l'état du bouton mute
    if (voiceCallModals.muteBtn) {
      voiceCallModals.muteBtn.classList.remove('active');
    }
    // Nettoyer le flux audio
    if (voiceCallModals.remoteAudio) {
      voiceCallModals.remoteAudio.srcObject = null;
    }
  }

  function setConsentPillState(element, allowed, label) {
    if (!element) return;
    element.classList.remove('is-active', 'is-waiting');
    element.classList.add(allowed ? 'is-active' : 'is-waiting');
    const textNode = element.querySelector('.chat-call-consent__label');
    if (textNode && label) {
      textNode.textContent = label;
    }
    const dot = element.querySelector('.chat-call-consent__dot');
    if (dot) {
      dot.style.opacity = allowed ? '1' : '0.7';
    }
    element.setAttribute(
      'aria-label',
      `${label || ''} ${allowed ? 'autorisé' : 'en attente'}`.trim()
    );
  }

  function updateCallConsentUi(conversation) {
    if (!dom.chatCallConsent) return;
    if (!conversation || !conversation.otherParticipant) {
      dom.chatCallConsent.hidden = true;
      dom.chatCallConsent.classList.remove('is-disabled');
      if (dom.chatCallConsentToggle) {
        dom.chatCallConsentToggle.checked = false;
      }
      return;
    }
    const consent = ensureConversationConsent(conversation);
    dom.chatCallConsent.hidden = false;
    dom.chatCallConsent.classList.toggle('is-disabled', updatingCallConsent);
    if (dom.chatCallConsentToggle) {
      dom.chatCallConsentToggle.checked = Boolean(consent.me.allowed);
      dom.chatCallConsentToggle.disabled = updatingCallConsent;
    }
    setConsentPillState(dom.chatCallConsentSelf, consent.me.allowed, 'Vous');
    const otherName = conversation.otherParticipant?.name || 'Interlocuteur';
    if (dom.chatCallConsentOtherLabel) {
      dom.chatCallConsentOtherLabel.textContent = otherName;
    }
    setConsentPillState(dom.chatCallConsentOther, consent.other.allowed, otherName);
    if (dom.chatCallConsentHint) {
      dom.chatCallConsentHint.textContent = consent.ready
        ? 'Appels vocaux disponibles, vous pouvez lancer un appel.'
        : 'Les appels démarrent une fois vos deux accords enregistrés.';
    }
  }

  function updateCallButtonVisibility() {
    if (!dom.chatCallBtn) return;

    const conversation = activeConversationId ? findConversation(activeConversationId) : null;
    const hasOtherParticipant = conversation && conversation.otherParticipant;
    updateCallConsentUi(conversation);
    if (!hasOtherParticipant) {
      dom.chatCallBtn.hidden = true;
      return;
    }
    dom.chatCallBtn.hidden = false;
    const isBusy = Boolean(voiceCallManager?.isInCall());
    const consent = conversation
      ? ensureConversationConsent(conversation)
      : buildVoiceCallConsentState();
    const isReady = Boolean(consent.ready);
    dom.chatCallBtn.disabled = !isReady || isBusy;
    dom.chatCallBtn.setAttribute('aria-disabled', String(dom.chatCallBtn.disabled));
    if (!isReady) {
      dom.chatCallBtn.title =
        'Les appels seront disponibles après acceptation par vous et votre interlocuteur.';
    } else if (isBusy) {
      dom.chatCallBtn.title = 'Un appel est déjà en cours.';
    } else {
      dom.chatCallBtn.title = 'Démarrer un appel vocal';
    }
  }

  // ==================== END VOICE CALL FUNCTIONS ====================
})();
const PRICE_FORMATTER = new Intl.NumberFormat('fr-TN', {
  style: 'currency',
  currency: 'TND',
  maximumFractionDigits: 0
});
