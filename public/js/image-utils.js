/**
 * Utilitaire pour générer des balises <picture> avec lazy loading
 * Utilisé côté client pour afficher des images optimisées
 */

/**
 * Crée une balise picture responsive avec lazy loading
 * @param {Object} options - Options de l'image
 * @returns {HTMLElement} - Élément picture
 */
export function createResponsiveImage({
  src,
  alt = '',
  sizes = '100vw',
  className = '',
  loading = 'lazy',
  placeholder = null
}) {
  const picture = document.createElement('picture');

  // Extraire le nom de base et l'extension
  const pathParts = src.split('/');
  const filename = pathParts[pathParts.length - 1];
  const basePath = pathParts.slice(0, -1).join('/');
  const [name] = filename.split('.');

  // Source WebP pour navigateurs modernes
  const sourceWebp = document.createElement('source');
  sourceWebp.srcset = `
    ${basePath}/${name}-small.webp 400w,
    ${basePath}/${name}-medium.webp 800w,
    ${basePath}/${name}-large.webp 1200w
  `.trim();
  sourceWebp.type = 'image/webp';
  sourceWebp.sizes = sizes;
  picture.appendChild(sourceWebp);

  // Source JPEG fallback
  const sourceJpeg = document.createElement('source');
  sourceJpeg.srcset = `
    ${basePath}/${name}-small.jpeg 400w,
    ${basePath}/${name}-medium.jpeg 800w,
    ${basePath}/${name}-large.jpeg 1200w
  `.trim();
  sourceJpeg.type = 'image/jpeg';
  sourceJpeg.sizes = sizes;
  picture.appendChild(sourceJpeg);

  // Image fallback
  const img = document.createElement('img');
  img.src = `${basePath}/${name}-medium.jpeg`;
  img.alt = alt;
  img.loading = loading;
  if (className) {
    img.className = className;
  }

  // Placeholder LQIP si fourni
  if (placeholder) {
    img.style.backgroundImage = `url(${placeholder})`;
    img.style.backgroundSize = 'cover';
  }

  picture.appendChild(img);

  return picture;
}

/**
 * Initialise le lazy loading natif pour les images existantes
 */
export function initLazyLoading() {
  // Ajouter loading="lazy" aux images sans cet attribut
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach((img) => {
    // Ne pas lazy load les images au-dessus du fold
    const rect = img.getBoundingClientRect();
    const isAboveFold = rect.top < window.innerHeight;

    if (!isAboveFold) {
      img.loading = 'lazy';
    }
  });
}

/**
 * Lazy loading avec Intersection Observer (fallback pour anciens navigateurs)
 */
export function initLazyLoadingWithObserver() {
  if (!('IntersectionObserver' in window)) {
    return; // Pas de support, utiliser le loading natif
  }

  const images = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: '50px 0px', // Charger 50px avant que l'image soit visible
      threshold: 0.01
    }
  );

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * CDN Configuration
 * Remplace les URLs d'images par des URLs CDN
 */
export const CDN_CONFIG = {
  enabled: false, // À activer en production
  baseUrl: 'https://cdn.mapmarket.tn', // À remplacer par votre CDN

  /**
   * Transforme une URL locale en URL CDN
   * @param {string} url - URL locale
   * @returns {string} - URL CDN
   */
  transformUrl(url) {
    if (!this.enabled || !url) {
      return url;
    }

    // Si l'URL commence par /uploads/, remplacer par le CDN
    if (url.startsWith('/uploads/')) {
      return `${this.baseUrl}${url}`;
    }

    return url;
  }
};

/**
 * Précharge les images critiques
 * @param {Array<string>} urls - URLs des images à précharger
 */
export function preloadImages(urls) {
  const head = document.head;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = CDN_CONFIG.transformUrl(url);
    head.appendChild(link);
  });
}

/**
 * Détecte le support WebP
 * @returns {Promise<boolean>}
 */
export function supportsWebP() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
}

// Auto-initialisation au chargement de la page
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initLazyLoading();
    initLazyLoadingWithObserver();
  });
}
