/**
 * Constantes applicatives centralisées
 * Pour faciliter la maintenance et éviter les "magic numbers/strings"
 */

// Statuts des annonces
export const AD_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

// États des annonces (tous)
export const AD_STATUSES = Object.values(AD_STATUS);

// Catégories d'annonces
export const AD_CATEGORY = {
  REAL_ESTATE: 'immobilier',
  AUTO: 'auto',
  ELECTRONICS: 'electroniques',
  PARTS: 'pieces',
  FASHION: 'mode',
  LEISURE: 'loisirs'
};

export const AD_CATEGORIES = Object.values(AD_CATEGORY);

// Conditions des produits
export const AD_CONDITION = {
  NEW: 'new',
  VERY_GOOD: 'very_good',
  GOOD: 'good',
  FAIR: 'fair'
};

export const AD_CONDITIONS = Object.values(AD_CONDITION);

// Rôles utilisateurs
export const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin'
};

export const USER_ROLES = Object.values(USER_ROLE);

// Limites de pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// Limites de contenu
export const CONTENT_LIMITS = {
  AD_TITLE_MIN: 10,
  AD_TITLE_MAX: 80,
  AD_DESCRIPTION_MIN: 30,
  AD_DESCRIPTION_MAX: 2000,
  USER_NAME_MIN: 2,
  USER_NAME_MAX: 60,
  MAX_IMAGES_PER_AD: 10,
  PASSWORD_MIN_LENGTH: 8,
  // Limites de taille pour uploads
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_REQUEST_SIZE: 25 * 1024 * 1024 // 25MB
};

// Prix
export const PRICE_LIMITS = {
  MIN: 0.1,
  MAX: 9999999
};

// Limites de géolocalisation
export const GEO = {
  DEFAULT_RADIUS_KM: 10,
  MIN_RADIUS_KM: 1,
  MAX_RADIUS_KM: 100
};

// Durées de token
export const TOKEN_EXPIRES = {
  RESET_PASSWORD: 30 * 60 * 1000, // 30 minutes
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '30d'
};

// Rate limiting
export const RATE_LIMIT = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000
  },
  AUTH: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 50
  },
  FORGOT_PASSWORD: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10
  },
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 20
  }
};

// Types MIME autorisés pour les images
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Extensions de fichiers autorisées
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Messages d'erreur standards
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentification requise.',
  FORBIDDEN: "Vous n'avez pas les permissions nécessaires.",
  NOT_FOUND: 'Ressource introuvable.',
  VALIDATION_ERROR: 'Données invalides.',
  SERVER_ERROR: 'Erreur interne du serveur.',
  RATE_LIMITED: 'Trop de tentatives, réessayez plus tard.',
  EMAIL_EXISTS: 'Cet email est déjà utilisé.',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  INVALID_SESSION: 'Session invalide.',
  TOKEN_EXPIRED: 'Session expirée.',
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  AD_NOT_FOUND: 'Annonce introuvable.'
};

// Codes d'erreur HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Définitions des attributs par catégorie
export const CATEGORY_ATTRIBUTES = {
  [AD_CATEGORY.AUTO]: {
    fields: [
      { id: 'year', type: 'number', required: false },
      { id: 'mileage', type: 'number', required: false },
      { id: 'fuel', type: 'string', required: false },
      { id: 'gearbox', type: 'string', required: false }
    ]
  },
  [AD_CATEGORY.REAL_ESTATE]: {
    fields: [
      { id: 'surface', type: 'number', required: false },
      { id: 'rooms', type: 'number', required: false },
      { id: 'dpe', type: 'string', required: false },
      { id: 'furnished', type: 'boolean', required: false },
      { id: 'floor', type: 'number', required: false }
    ]
  },
  [AD_CATEGORY.ELECTRONICS]: {
    fields: [
      { id: 'storage', type: 'number', required: false },
      { id: 'brand', type: 'string', required: false },
      { id: 'grade', type: 'string', required: false }
    ]
  },
  [AD_CATEGORY.PARTS]: {
    fields: [
      { id: 'compatible', type: 'string', required: false },
      { id: 'grade', type: 'string', required: false },
      { id: 'reference', type: 'string', required: false }
    ]
  },
  [AD_CATEGORY.FASHION]: {
    fields: [
      { id: 'gender', type: 'string', required: false },
      { id: 'size', type: 'string', required: false },
      { id: 'brand', type: 'string', required: false }
    ]
  },
  [AD_CATEGORY.LEISURE]: {
    fields: [
      { id: 'activity', type: 'string', required: false },
      { id: 'brand', type: 'string', required: false },
      { id: 'model', type: 'string', required: false }
    ]
  }
};

// Options de tri pour les annonces
export const AD_SORT_OPTIONS = {
  NEWEST: 'newest',
  PRICE_ASC: 'priceAsc',
  PRICE_DESC: 'priceDesc',
  VIEWS: 'views'
};

// Configuration des cookies
export const COOKIE_CONFIG = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  OPTIONS: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // sera overridé en production
  }
};

// Regex utiles
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+216)?[0-9]{8}$/,
  MONGODB_ID: /^[a-f\d]{24}$/i
};

// Noms de collections MongoDB
export const COLLECTIONS = {
  USERS: 'users',
  ADS: 'ads'
};

export default {
  AD_STATUS,
  AD_STATUSES,
  AD_CATEGORY,
  AD_CATEGORIES,
  AD_CONDITION,
  AD_CONDITIONS,
  USER_ROLE,
  USER_ROLES,
  PAGINATION,
  CONTENT_LIMITS,
  PRICE_LIMITS,
  GEO,
  TOKEN_EXPIRES,
  RATE_LIMIT,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  CATEGORY_ATTRIBUTES,
  AD_SORT_OPTIONS,
  COOKIE_CONFIG,
  REGEX,
  COLLECTIONS
};
