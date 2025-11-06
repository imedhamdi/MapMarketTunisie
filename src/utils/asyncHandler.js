/**
 * Wrapper pour gérer automatiquement les erreurs asynchrones dans les controllers
 * Évite d'avoir à écrire try/catch dans chaque fonction async
 *
 * @param {Function} fn - Fonction async à wrapper
 * @returns {Function} - Fonction wrappée avec gestion d'erreur
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Fabrique pour créer des erreurs API courantes
 */
export const createError = {
  badRequest: (message, code = 'BAD_REQUEST') => new ApiError(400, code, message),

  unauthorized: (message = 'Authentification requise.', code = 'UNAUTHORIZED') =>
    new ApiError(401, code, message),

  forbidden: (message = 'Accès interdit.', code = 'FORBIDDEN') => new ApiError(403, code, message),

  notFound: (message = 'Ressource introuvable.', code = 'NOT_FOUND') =>
    new ApiError(404, code, message),

  conflict: (message = 'Conflit de ressource.', code = 'CONFLICT') =>
    new ApiError(409, code, message),

  unprocessableEntity: (message = 'Entité non traitable.', code = 'UNPROCESSABLE_ENTITY') =>
    new ApiError(422, code, message),

  tooManyRequests: (message = 'Trop de requêtes.', code = 'RATE_LIMITED') =>
    new ApiError(429, code, message),

  internal: (message = 'Erreur interne du serveur.', code = 'INTERNAL_ERROR') =>
    new ApiError(500, code, message)
};

export default asyncHandler;
