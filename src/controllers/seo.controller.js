/**
 * Génère le sitemap XML pour le SEO
 * Usage: GET /sitemap.xml
 */

import Ad from '../models/ad.model.js';
import env from '../config/env.js';

const SITE_URL = env.clientOrigin || 'https://mapmarket.tn';

/**
 * Génère le sitemap XML
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
export async function generateSitemap(req, res) {
  try {
    // Récupérer toutes les annonces actives
    const ads = await Ad.find({ status: 'active' })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5000) // Limite de 50000 URLs par sitemap
      .lean();

    // Construire le XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Page d'accueil
    xml += `  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>\n`;

    // Catégories
    const categories = ['immobilier', 'auto', 'electroniques', 'pieces', 'mode', 'loisirs'];
    categories.forEach((category) => {
      xml += `  <url>
    <loc>${SITE_URL}/category/${category}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>\n`;
    });

    // Annonces
    ads.forEach((ad) => {
      const lastmod = ad.updatedAt ? ad.updatedAt.toISOString() : new Date().toISOString();
      xml += `  <url>
    <loc>${SITE_URL}/ad/${ad._id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastmod}</lastmod>
  </url>\n`;
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res
      .status(500)
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap generation failed</error>');
  }
}

/**
 * Génère robots.txt
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
export function generateRobotsTxt(req, res) {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /uploads/avatars/

Sitemap: ${SITE_URL}/sitemap.xml

# Optimized crawl rate
Crawl-delay: 1

# Social media bots
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
}
