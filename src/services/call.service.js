import Call from '../models/call.model.js';
import Conversation from '../models/conversation.model.js';
import { createError } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import messageService from './message.service.js';

class CallService {
  determineCallOutcome(call) {
    if (!call) return 'failed';
    if (call.status === 'missed' || call.endReason === 'timeout') {
      return 'missed';
    }
    if (call.status === 'rejected' || call.endReason === 'rejected') {
      return 'rejected';
    }
    if (call.endReason === 'cancelled') {
      return 'cancelled';
    }
    if (call.status === 'failed' || call.endReason === 'error' || call.endReason === 'network') {
      return 'failed';
    }
    return 'completed';
  }

  /**
   * Créer un nouvel appel
   */
  async createCall({ conversationId, initiatorId, type = 'audio' }) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw createError('Conversation introuvable', 404);
      }

      // Vérifier que l'initiateur fait partie de la conversation
      if (!conversation.participants.some((p) => p.toString() === initiatorId.toString())) {
        throw createError('Non autorisé à appeler dans cette conversation', 403);
      }

      const call = await Call.create({
        conversation: conversationId,
        participants: conversation.participants,
        initiator: initiatorId,
        type,
        status: 'initiated'
      });

      return call;
    } catch (error) {
      logger.error('CallService.createCall error:', error);
      throw error;
    }
  }

  /**
   * Enregistrer un résumé d'appel dans la conversation
   */
  async recordCallMessage(call) {
    if (!call) return { message: null, conversationId: null };
    try {
      const conversationId =
        call.conversation?._id?.toString?.() ?? call.conversation?.toString?.();
      if (!conversationId) {
        return { message: null, conversationId: null };
      }
      const payload = {
        callId: call._id,
        type: call.type,
        status: this.determineCallOutcome(call),
        reason: call.endReason || null,
        duration: call.duration || 0,
        startedAt: call.startedAt || null,
        endedAt: call.endedAt || null,
        initiator: call.initiator
      };
      const message = await messageService.createMessage(conversationId, call.initiator, '', {
        type: 'call',
        call: payload
      });
      return { message, conversationId };
    } catch (error) {
      logger.error('CallService.recordCallMessage error:', error);
      return { message: null, conversationId: null };
    }
  }

  /**
   * Mettre à jour le statut d'un appel
   */
  async updateCallStatus(callId, status, additionalData = {}) {
    try {
      const updateData = { status, ...additionalData };

      // Si l'appel est répondu, enregistrer l'heure de début
      if (status === 'answered' && !additionalData.startedAt) {
        updateData.startedAt = new Date();
      }

      // Si l'appel se termine, enregistrer l'heure de fin et calculer la durée
      if (status === 'ended' && !additionalData.endedAt) {
        updateData.endedAt = new Date();
      }

      const call = await Call.findByIdAndUpdate(callId, updateData, {
        new: true,
        runValidators: true
      }).populate('participants', 'username avatar');

      if (!call) {
        throw createError('Appel introuvable', 404);
      }

      return call;
    } catch (error) {
      logger.error('CallService.updateCallStatus error:', error);
      throw error;
    }
  }

  /**
   * Terminer un appel
   */
  async endCall(callId, endReason = 'completed', { triggeredBy = null } = {}) {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw createError('Appel introuvable', 404);
      }
      if (call.status === 'ended' && call.endReason) {
        const conversationId =
          call.conversation?._id?.toString?.() ?? call.conversation?.toString?.();
        return { call, message: null, conversationId, triggeredBy };
      }

      const endedAt = new Date();
      const updateData = {
        status: 'ended',
        endedAt,
        endReason
      };

      // Calculer la durée si l'appel a été répondu
      if (call.startedAt) {
        updateData.duration = Math.floor((endedAt - call.startedAt) / 1000);
      }

      const updatedCall = await Call.findByIdAndUpdate(callId, updateData, {
        new: true
      }).populate('participants', 'username avatar');

      const { message, conversationId } = await this.recordCallMessage(updatedCall);

      return { call: updatedCall, message, conversationId, triggeredBy };
    } catch (error) {
      logger.error('CallService.endCall error:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des appels pour une conversation
   */
  async getCallHistory(conversationId, limit = 50, skip = 0) {
    try {
      const calls = await Call.find({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('initiator', 'username avatar')
        .populate('participants', 'username avatar')
        .lean();

      return calls;
    } catch (error) {
      logger.error('CallService.getCallHistory error:', error);
      throw error;
    }
  }

  /**
   * Obtenir un appel par ID
   */
  async getCallById(callId) {
    try {
      const call = await Call.findById(callId)
        .populate('initiator', 'username avatar')
        .populate('participants', 'username avatar')
        .lean();

      if (!call) {
        throw createError('Appel introuvable', 404);
      }

      return call;
    } catch (error) {
      logger.error('CallService.getCallById error:', error);
      throw error;
    }
  }

  /**
   * Marquer un appel comme manqué
   */
  async markAsMissed(callId, { triggeredBy = null } = {}) {
    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        {
          status: 'missed',
          endedAt: new Date(),
          endReason: 'timeout'
        },
        { new: true }
      ).populate('participants', 'username avatar');

      const { message, conversationId } = await this.recordCallMessage(call);

      return { call, message, conversationId, triggeredBy };
    } catch (error) {
      logger.error('CallService.markAsMissed error:', error);
      throw error;
    }
  }

  /**
   * Rejeter un appel
   */
  async rejectCall(callId, { triggeredBy = null } = {}) {
    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        {
          status: 'rejected',
          endedAt: new Date(),
          endReason: 'rejected'
        },
        { new: true }
      ).populate('participants', 'username avatar');

      const { message, conversationId } = await this.recordCallMessage(call);

      return { call, message, conversationId, triggeredBy };
    } catch (error) {
      logger.error('CallService.rejectCall error:', error);
      throw error;
    }
  }
}

export default new CallService();
