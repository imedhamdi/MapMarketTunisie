/**
 * Module pour gérer les annonces récemment vues
 * SCOPE: Section #recentlyViewedSection uniquement
 * Ne touche PAS aux carrousels d'images des cartes d'annonces
 */
(function initRecentlyViewedSection() {
  'use strict';

  // ========== CONFIGURATION ==========
  const API_BASE = resolveApiBase();
  const SECTION_ID = 'recentlyViewedSection';
  const TRACK_ID = 'recentlyViewedTrack';
  const BTN_PREV_ID = 'recentlyViewedPrev';
  const BTN_NEXT_ID = 'recentlyViewedNext';
  const SCROLL_STEP = 320; // Largeur approx. d'une carte + gap (ajuster si besoin)

  function resolveApiBase() {
    const candidates = [window.__API_BASE__, window.API_BASE];
    for (const candidate of candidates) {
      const normalized = normalizeApiBase(candidate);
      if (normalized) {
        return normalized;
      }
    }
    const origin = window.location?.origin || '';
    return origin ? `${origin}/api/v1` : '/api/v1';
  }

  function normalizeApiBase(value) {
    if (typeof value !== 'string') {
      return null;
    }
    let base = value.trim();
    if (!base) {
      return null;
    }
    const hasProtocol = /^https?:\/\//i.test(base);
    const isRelative = base.startsWith('/');
    if (!hasProtocol && !isRelative) {
      base = `https://${base}`;
    }
    base = base.replace(/\/+$/, '');
    if (/\/api(\/v\d+)?$/i.test(base)) {
      return base;
    }
    return `${base}/api/v1`;
  }

  function buildApiUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  // ========== SÉLECTEURS SCOPÉS ==========
  const section = document.getElementById(SECTION_ID);
  if (!section) {
    return;
  }

  const track = section.querySelector(`#${TRACK_ID}`);
  const btnPrev = section.querySelector(`#${BTN_PREV_ID}`);
  const btnNext = section.querySelector(`#${BTN_NEXT_ID}`);
  let listenersAttached = false;

  if (!track || !btnPrev || !btnNext) {
    console.error(
      '[RecentlyViewed] Un ou plusieurs éléments du carrousel sont manquants. Vérifiez les IDs dans le HTML.',
      {
        trackElement: track,
        btnPrevElement: btnPrev,
        btnNextElement: btnNext
      }
    );
    return;
  }

  // ========== FONCTIONS UTILITAIRES ==========

  /**
   * Vérifier si l'utilisateur est connecté via authStore
   */
  function isUserLoggedIn() {
    try {
      const authUser = window.authStore?.get();
      return authUser && (authUser._id || authUser.id);
    } catch (error) {
      return false;
    }
  }

  /**
   * Échapper les caractères HTML pour éviter XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== GESTION DU CARROUSEL ==========

  /**
   * Mettre à jour l'état des boutons de navigation
   */
  function updateButtons() {
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;

    btnPrev.disabled = atStart;
    btnNext.disabled = atEnd;

    // ...existing code...
  }

  /**
   * Réinitialiser le carrousel et masquer la section
   */
  function hideSectionAndReset() {
    track.innerHTML = '';
    track.setAttribute('role', 'list');
    btnPrev.disabled = true;
    btnNext.disabled = true;
    section.hidden = true;
  }

  /**
   * Défiler vers la gauche
   */
  function scrollPrev() {
    // ...existing code...
    track.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
    setTimeout(updateButtons, 300); // Attendre la fin de l'animation
  }

  /**
   * Défiler vers la droite
   */
  function scrollNext() {
    // ...existing code...
    track.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
    setTimeout(updateButtons, 300); // Attendre la fin de l'animation
  }

  // ========== RENDU DES CARTES ==========

  /**
   * Créer une carte d'annonce
   */
  function createAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'carousel-card';
    card.setAttribute('role', 'listitem');
    card.dataset.adId = ad._id;

    const imageUrl = ad.thumbnails?.[0] || ad.images?.[0] || '/icons/placeholder.svg';
    const price = ad.price ? `${ad.price.toLocaleString('fr-FR')} DT` : 'Prix non spécifié';
    const location = ad.locationText || 'Lieu non spécifié';

    card.innerHTML = `
      <div class="carousel-card__image-wrapper">
        <img 
          src="${imageUrl}" 
          alt="${escapeHtml(ad.title)}"
          class="carousel-card__image"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div class="carousel-card__content">
        <h3 class="carousel-card__title">${escapeHtml(ad.title)}</h3>
        <div class="carousel-card__footer">
          <p class="carousel-card__price">${price}</p>
          <p class="carousel-card__location">${escapeHtml(location)}</p>
        </div>
      </div>
    `;

    // Ajouter le gestionnaire de clic
    card.addEventListener('click', () => {
      // Marquer pour éviter de réinjecter dans la liste
      window.__skipRecentlyViewedTracking = true;
      if (typeof window.openDetailsById === 'function') {
        window.openDetailsById(ad._id);
      }
      setTimeout(() => {
        window.__skipRecentlyViewedTracking = false;
      }, 1000);
    });

    return card;
  }

  /**
   * Rendre les annonces dans le track
   */
  function renderAds(ads) {
    // ...existing code...

    // Vider le track
    track.innerHTML = '';
    track.setAttribute('role', 'list');

    // Ajouter les cartes
    ads.forEach((ad, _index) => {
      // ...existing code...
      const card = createAdCard(ad);
      track.appendChild(card);
    });

    // Mettre à jour les boutons après le rendu
    setTimeout(updateButtons, 150);
  }

  // ========== CHARGEMENT DES DONNÉES ==========

  /**
   * Charger les annonces récemment vues depuis l'API
   */
  async function loadRecentlyViewedAds() {
    // ...existing code...

    try {
      const response = await fetch(buildApiUrl('/users/me/recently-viewed'), {
        credentials: 'include'
      });

      if (!response.ok) {
        // ...existing code...
        hideSectionAndReset();
        return;
      }

      const result = await response.json();
      const ads = result.data?.ads || [];

      // ...existing code...

      if (ads.length > 0) {
        renderAds(ads);
        section.hidden = false;
      } else {
        hideSectionAndReset();
      }
    } catch (error) {
      console.error('[RecentlyViewed] Erreur chargement:', error);
      hideSectionAndReset();
    }
  }

  /**
   * Enregistrer une vue d'annonce (tracking)
   */
  async function trackAdView(adId) {
    // Ignorer si flag actif
    if (window.__skipRecentlyViewedTracking) {
      // ...existing code...
      return;
    }

    // Ignorer si non connecté
    if (!isUserLoggedIn()) {
      return;
    }

    try {
      // ...existing code...
      const response = await fetch(buildApiUrl('/users/me/recently-viewed'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adId })
      });

      if (response.ok) {
        // ...existing code...
        // Recharger les annonces
        loadRecentlyViewedAds();
      } else {
        // ...existing code...
      }
    } catch (error) {
      console.error('[RecentlyViewed] Erreur tracking:', error);
    }
  }

  // ========== INITIALISATION ==========

  /**
   * Attacher les event listeners
   */
  function attachListeners() {
    if (listenersAttached) {
      return;
    }
    listenersAttached = true;

    // ...existing code...

    // Navigation
    btnPrev.addEventListener('click', scrollPrev);
    btnNext.addEventListener('click', scrollNext);
    track.addEventListener('scroll', updateButtons, { passive: true });

    // ...existing code...
  }

  /**
   * Initialiser le module principal
   */
  function init() {
    // ...existing code...

    // Vérifier connexion
    if (!isUserLoggedIn()) {
      // ...existing code...
      hideSectionAndReset();
      return;
    }

    // ...existing code...

    // Attacher les listeners
    attachListeners();

    // Charger les annonces immédiatement après connexion
    loadRecentlyViewedAds();
  }

  // ========== ÉCOUTER LES CHANGEMENTS D'AUTH ==========

  /**
   * Gérer les changements d'authentification
   */
  document.addEventListener('auth:change', (event) => {
    // ...existing code...

    if (event.detail && (event.detail._id || event.detail.id)) {
      // ...existing code...
      init();
    } else {
      // ...existing code...
      hideSectionAndReset();
    }
  });

  // ========== EXPOSITION GLOBALE ==========

  window.recentlyViewed = {
    trackAdView,
    loadRecentlyViewedAds
  };

  // ========== DÉMARRAGE ==========

  /**
   * Attendre que authStore soit disponible
   */
  function waitForAuthStore() {
    if (window.authStore) {
      // ...existing code...
      init();
    } else {
      // ...existing code...
      setTimeout(waitForAuthStore, 50);
    }
  }

  // Démarrer selon l'état du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForAuthStore);
  } else {
    waitForAuthStore();
  }

  // ...existing code...
})();
