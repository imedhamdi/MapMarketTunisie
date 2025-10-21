import Joi from 'joi';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const baseName = Joi.string().trim().min(2).max(60);
const baseEmail = Joi.string().trim().lowercase().email({ tlds: { allow: false } });

const coordsSchema = Joi.alternatives()
  .try(
    Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }),
    Joi.array().length(2).items(Joi.number())
  )
  .messages({
    'alternatives.match': 'Coordonnées invalides'
  });

const locationSchema = Joi.object({
  city: Joi.string().trim().max(120).allow('', null),
  coords: coordsSchema.optional(),
  radiusKm: Joi.number().min(1).max(100).optional(),
  consent: Joi.boolean().optional()
})
  .min(1)
  .optional();

export const updateMeSchema = Joi.object({
  name: baseName.optional(),
  email: baseEmail.optional(),
  location: locationSchema
}).min(1);

export const updateLocationSchema = locationSchema.required();

export const favoritesSchema = Joi.object({
  adId: Joi.string().pattern(objectIdRegex).required().messages({
    'string.pattern.base': 'Identifiant d’annonce invalide'
  }),
  action: Joi.string().valid('add', 'remove').required()
});
