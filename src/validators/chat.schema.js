import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const startConversationSchema = Joi.object({
  adId: objectId.required(),
  text: Joi.string().allow('').max(2000).optional()
});

export const sendMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
  attachments: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        url: Joi.string().uri().allow(null),
        thumbnailUrl: Joi.string().uri().allow(null),
        mime: Joi.string().required(),
        size: Joi.number().min(0).required(),
        width: Joi.number().allow(null),
        height: Joi.number().allow(null)
      })
    )
    .max(5)
    .optional(),
  clientTempId: Joi.string().max(100).allow(null)
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
