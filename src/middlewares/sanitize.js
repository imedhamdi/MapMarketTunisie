import sanitizeHtml from 'sanitize-html';

/**
 * Configuration de sanitization par défaut
 */
const defaultSanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {}
};

/**
 * Sanitize une valeur string
 */
function sanitizeString(value, options = {}) {
  if (typeof value !== 'string') {
    return value;
  }

  return sanitizeHtml(value, {
    ...defaultSanitizeOptions,
    ...options
  }).trim();
}

/**
 * Sanitize récursivement un objet
 */
function sanitizeObject(obj, options = {}) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj, options) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  const sanitized = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Middleware Express pour sanitizer le body, query et params
 */
export function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
}
