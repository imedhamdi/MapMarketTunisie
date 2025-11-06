import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const attachmentSchema = Joi.object({
  key: Joi.string().required(),
  url: Joi.string().uri().optional().allow(null, ''),
  thumbnailUrl: Joi.string().uri().optional().allow(null, ''),
  mime: Joi.string().required(),
  size: Joi.number().min(0).required(),
  width: Joi.number().optional().allow(null),
  height: Joi.number().optional().allow(null),
  originalName: Joi.string().optional()
});

export const startConversationSchema = Joi.object({
  adId: objectId.required(),
  text: Joi.string().allow('').max(2000).optional()
});

export const sendMessageSchema = Joi.object({
  text: Joi.string().allow('').trim().max(2000).optional(),
  attachments: Joi.array().items(attachmentSchema).max(5).optional(),
  clientTempId: Joi.string().max(100).allow(null)
})
  .custom((value, helpers) => {
    const hasText = typeof value.text === 'string' && value.text.trim().length > 0;
    const hasAttachments = Array.isArray(value.attachments) && value.attachments.length > 0;
    if (!hasText && !hasAttachments) {
      return helpers.error('any.custom');
    }
    if (hasAttachments) {
      value.attachments = value.attachments.filter(Boolean);
    }
    return value;
  }, 'Message content validation')
  .messages({
    'any.custom': 'Un message doit contenir du texte ou une pièce jointe.'
  });

export const getMessagesSchema = Joi.object({
  limit: Joi.number().min(1).max(200).optional(),
  before: Joi.date().iso().optional()
});

export const getConversationsSchema = Joi.object({
  limit: Joi.number().min(1).max(100).optional(),
  skip: Joi.number().min(0).optional()
});

export const conversationIdSchema = Joi.object({
  id: objectId.required()
});

export const reportMessageParamsSchema = Joi.object({
  messageId: objectId.required()
});

export const reportMessageBodySchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required()
});

export const searchMessagesSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
  conversationId: objectId.optional(),
  limit: Joi.number().min(1).max(100).optional(),
  cursor: Joi.string().optional()
});
