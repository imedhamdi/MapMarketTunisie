import Joi from 'joi';

const titleSchema = Joi.string().trim().min(10).max(80).messages({
  'string.min': 'Le titre doit contenir entre 10 et 80 caractères.',
  'string.max': 'Le titre doit contenir entre 10 et 80 caractères.',
  'string.empty': 'Le titre doit contenir entre 10 et 80 caractères.'
});

const descriptionSchema = Joi.string().trim().min(30).max(2000).messages({
  'string.min': 'La description doit contenir au moins 30 caractères.',
  'string.max': 'La description ne doit pas dépasser 2000 caractères.',
  'string.empty': 'La description doit contenir au moins 30 caractères.'
});

const categorySchema = Joi.string()
  .valid('immobilier', 'auto', 'electroniques', 'pieces')
  .required()
  .messages({ 'any.only': 'Sélectionnez une catégorie.', 'any.required': 'Sélectionnez une catégorie.' });

const conditionSchema = Joi.string()
  .valid('new', 'very_good', 'good', 'fair')
  .required()
  .messages({ 'any.only': 'Sélectionnez l’état de l’article.', 'any.required': 'Sélectionnez l’état de l’article.' });

const priceSchema = Joi.number().min(0.1).max(9999999).required().messages({
  'number.base': 'Indiquez un prix valide (0.1 à 9 999 999).',
  'number.min': 'Indiquez un prix valide (0.1 à 9 999 999).',
  'number.max': 'Indiquez un prix valide (0.1 à 9 999 999).',
  'any.required': 'Indiquez un prix valide (0.1 à 9 999 999).'
});

const locationSchema = Joi.object({
  locationText: Joi.string().trim().min(2).required().messages({
    'string.empty': 'Indiquez une adresse.'
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.base': 'Latitude invalide.',
    'number.min': 'Latitude invalide.',
    'number.max': 'Latitude invalide.'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.base': 'Longitude invalide.',
    'number.min': 'Longitude invalide.',
    'number.max': 'Longitude invalide.'
  })
});

const imageUrlSchema = Joi.string().trim().custom((value, helpers) => {
  if (!value) return value;
  if (value.startsWith('data:image/')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return helpers.error('any.invalid');
}, 'image url validation');

const imagesSchema = Joi.array().items(imageUrlSchema.messages({ 'any.invalid': 'Chaque image doit être une URL valide.' })).max(10).default([]);

const attributeSchemas = {
  auto: Joi.object({
    year: Joi.number().integer().min(1980).max(new Date().getFullYear()).required().messages({
      'number.base': 'Année invalide.',
      'number.min': 'Année invalide.',
      'number.max': `Année invalide.`
    }),
    mileage: Joi.number().integer().min(0).max(500000).required().messages({
      'number.base': 'Kilométrage invalide.',
      'number.min': 'Kilométrage invalide.',
      'number.max': 'Kilométrage invalide.'
    }),
    fuel: Joi.string().valid('essence', 'diesel', 'hybride', 'electrique', 'gpl').required(),
    gearbox: Joi.string().valid('manuelle', 'automatique').required()
  }),
  immobilier: Joi.object({
    surface: Joi.number().min(5).max(1000).required(),
    rooms: Joi.number().integer().min(1).max(20).required(),
    dpe: Joi.string().valid('A', 'B', 'C', 'D', 'E', 'F', 'G').required(),
    furnished: Joi.boolean().optional(),
    floor: Joi.number().integer().min(0).max(50).allow(null, '')
  }),
  electroniques: Joi.object({
    storage: Joi.number().integer().min(1).max(4096).required(),
    brand: Joi.string().trim().min(2).max(60).required(),
    grade: Joi.string().valid('neuf', 'comme neuf', 'très bon', 'bon', 'correct').required()
  }),
  pieces: Joi.object({
    compatible: Joi.string().trim().min(2).max(120).required(),
    grade: Joi.string().valid('neuf', 'comme neuf', 'très bon', 'bon', 'correct').required(),
    reference: Joi.string().trim().max(120).allow('', null)
  })
};

const baseAdSchema = Joi.object({
  title: titleSchema,
  description: descriptionSchema,
  category: categorySchema,
  condition: conditionSchema,
  price: priceSchema,
  images: imagesSchema,
  locationText: locationSchema.extract('locationText'),
  latitude: locationSchema.extract('latitude'),
  longitude: locationSchema.extract('longitude'),
  attributes: Joi.object().unknown(true).default({})
});

export const createAdSchema = baseAdSchema.fork(['title', 'description', 'category', 'condition', 'price', 'locationText', 'latitude', 'longitude'], (schema) =>
  schema.required()
).custom((value, helpers) => {
  const schema = attributeSchemas[value.category];
  if (!schema) return value;
  const { error } = schema.validate(value.attributes || {}, { abortEarly: false });
  if (error) return helpers.error('any.custom', { message: error.details[0].message });
  return value;
}, 'category attributes validation');

export const updateAdSchema = Joi.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  category: categorySchema.optional(),
  condition: conditionSchema.optional(),
  price: priceSchema.optional(),
  images: imagesSchema.optional(),
  locationText: locationSchema.extract('locationText').optional(),
  latitude: locationSchema.extract('latitude').optional(),
  longitude: locationSchema.extract('longitude').optional(),
  attributes: Joi.object().unknown(true).optional()
})
  .min(1)
  .custom((value, helpers) => {
    if (!value.category && !helpers.state.ancestors[0].category) return value;
    const category = value.category || helpers.state.ancestors[0].category;
    const schema = attributeSchemas[category];
    if (!schema) return value;
    if (value.attributes == null) return value;
    const { error } = schema.validate(value.attributes, { abortEarly: false, presence: 'optional' });
    if (error) return helpers.error('any.custom', { message: error.details[0].message });
    return value;
  }, 'category attributes validation');
