import Call from '../models/call.model.js';
import Conversation from '../models/conversation.model.js';
import { createError } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

class CallService {
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
  async endCall(callId, endReason = 'completed') {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw createError('Appel introuvable', 404);
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

      const updatedCall = await Call.findByIdAndUpdate(callId, updateData, { new: true }).populate(
        'participants',
        'username avatar'
      );

      return updatedCall;
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
  async markAsMissed(callId) {
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

      return call;
    } catch (error) {
      logger.error('CallService.markAsMissed error:', error);
      throw error;
    }
  }

  /**
   * Rejeter un appel
   */
  async rejectCall(callId) {
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

      return call;
    } catch (error) {
      logger.error('CallService.rejectCall error:', error);
      throw error;
    }
  }
}

export default new CallService();
