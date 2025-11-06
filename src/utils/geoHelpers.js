/**
 * Helpers pour la gestion des coordonnées géographiques
 * Centralise la logique de normalisation pour éviter la duplication
 */

/**
 * Normalise les coordonnées géographiques
 * @param {*} value - Valeur à normaliser (peut être un objet Mongoose ou plain)
 * @returns {Object|null} - Objet normalisé avec coords ou null
 */
export function normalizeLocationValue(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const plain =
    typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value };

  const coords = plain.coords;
  const coordinatesArray = Array.isArray(coords)
    ? coords
    : Array.isArray(coords?.coordinates)
      ? coords.coordinates
      : null;

  if (!coordinatesArray || coordinatesArray.length !== 2) {
    delete plain.coords;
    return plain;
  }

  const normalized = coordinatesArray.map((entry) => Number(entry));
  if (normalized.some((num) => Number.isNaN(num) || !Number.isFinite(num))) {
    delete plain.coords;
    return plain;
  }

  return {
    ...plain,
    coords: {
      type: 'Point',
      coordinates: normalized
    }
  };
}

/**
 * Valide les coordonnées GeoJSON
 * @param {Array} value - Tableau [longitude, latitude]
 * @returns {boolean} - true si valide
 */
export function validateCoordinates(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length !== 2) {
    return false;
  }
  return value.every((num) => typeof num === 'number' && Number.isFinite(num));
}

/**
 * Valide les coordonnées avec vérification de présence
 * @param {Array} value - Tableau [longitude, latitude]
 * @returns {boolean} - true si valide et non vide
 */
export function validateNonEmptyCoordinates(value) {
  if (!value || value.length === 0) {
    return false;
  }
  return validateCoordinates(value);
}

/**
 * Crée un objet GeoJSON Point
 * @param {number} longitude
 * @param {number} latitude
 * @returns {Object} - Objet GeoJSON Point
 */
