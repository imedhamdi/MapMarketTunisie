import Joi from 'joi';

export const subscribeNewsletterSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
});
