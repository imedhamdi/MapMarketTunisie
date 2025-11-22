/**
 * Constantes applicatives centralisées
 * Limitées aux valeurs réellement utilisées pour éviter le code mort.
 */

export const AD_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived'
};

export const AD_CATEGORY = {
  REAL_ESTATE: 'immobilier',
  AUTO: 'auto',
  ELECTRONICS: 'electroniques',
  PARTS: 'pieces',
  FASHION: 'mode',
  LEISURE: 'loisirs'
};

export const AD_CONDITION = {
  NEW: 'new',
  VERY_GOOD: 'very_good',
  GOOD: 'good',
  FAIR: 'fair'
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

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
