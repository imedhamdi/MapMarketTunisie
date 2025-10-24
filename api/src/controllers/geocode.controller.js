import { sendSuccess, sendError } from '../utils/responses.js';

/**
 * Reverse geocoding - Récupère le nom de la ville à partir des coordonnées
 */
export async function reverseGeocode(req, res) {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return sendError(res, { message: 'Paramètres lat et lng requis', statusCode: 400 });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return sendError(res, { message: 'Coordonnées invalides', statusCode: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lngNum}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'MapMarketTunisie/1.0'
        }
      }
    );

    if (!response.ok) {
      return sendError(res, { message: 'Erreur lors du reverse geocoding', statusCode: response.status });
    }

    const data = await response.json();

    // Extraire le nom de la ville
    const address = data.address || {};
    const city = address.city || 
                address.town || 
                address.village || 
                address.municipality || 
                address.county ||
                address.state ||
                '';

    return sendSuccess(res, { data: { city, fullAddress: data } });
  } catch (error) {
    console.error('Erreur reverse geocoding:', error);
    return sendError(res, { message: 'Erreur serveur lors du reverse geocoding', statusCode: 500 });
  }
}
