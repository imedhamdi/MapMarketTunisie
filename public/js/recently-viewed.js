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
  const btnClear = section.querySelector('#recentlyViewedClear');
  let listenersAttached = false;
  const SKELETON_CARD_COUNT = 4;
  const MIN_ADS_TO_DISPLAY = 5;

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

  function hideClearButton() {
    if (!btnClear) {
      return;
    }
    btnClear.hidden = true;
    btnClear.disabled = true;
    btnClear.removeAttribute('data-loading');
    const defaultLabel = btnClear.dataset?.label;
    if (defaultLabel) {
      btnClear.textContent = defaultLabel;
    }
  }

  function showClearButton() {
    if (!btnClear) {
      return;
    }
    btnClear.hidden = false;
    btnClear.disabled = false;
    btnClear.dataset.loading = 'false';
    const defaultLabel = btnClear.dataset?.label;
    if (defaultLabel) {
      btnClear.textContent = defaultLabel;
    }
  }

  function setClearButtonLoadingState(isButtonLoading) {
    if (!btnClear) {
      return;
    }
    if (isButtonLoading) {
      btnClear.disabled = true;
      btnClear.dataset.loading = 'true';
      const loadingLabel = btnClear.dataset?.loadingLabel;
      if (loadingLabel) {
        btnClear.textContent = loadingLabel;
      }
    } else {
      btnClear.disabled = false;
      btnClear.dataset.loading = 'false';
      const defaultLabel = btnClear.dataset?.label;
      if (defaultLabel) {
        btnClear.textContent = defaultLabel;
      }
    }
  }

  hideClearButton();

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

  function stopLoadingState() {
    track.removeAttribute('aria-busy');
  }

  function showSkeletonPlaceholders(count = SKELETON_CARD_COUNT) {
    if (!track) {
      return;
    }
    track.setAttribute('aria-busy', 'true');
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const skeleton = document.createElement('div');
      skeleton.className = 'carousel-card carousel-card--skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      skeleton.innerHTML = `
        <div class="carousel-card__image-wrapper">
          <span class="skeleton-block"></span>
        </div>
        <div class="carousel-card__content">
          <span class="skeleton-block skeleton-line skeleton-line--wide"></span>
          <span class="skeleton-block skeleton-line skeleton-line--narrow"></span>
          <div class="carousel-card__footer">
            <span class="skeleton-block skeleton-line skeleton-line--price"></span>
            <span class="skeleton-block skeleton-line skeleton-line--narrow"></span>
          </div>
        </div>
      `;
      fragment.appendChild(skeleton);
    }
    track.innerHTML = '';
    track.setAttribute('role', 'list');
    track.appendChild(fragment);
    section.hidden = false;
    hideClearButton();
    btnPrev.disabled = true;
    btnNext.disabled = true;
    setTimeout(updateButtons, 0);
  }

  function startLoading(options = {}) {
    const { withSkeleton = true } = options;
    if (withSkeleton) {
      showSkeletonPlaceholders();
    } else {
      track.setAttribute('aria-busy', 'true');
      if (btnClear) {
        btnClear.disabled = true;
      }
    }
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
    stopLoadingState();
    track.innerHTML = '';
    track.setAttribute('role', 'list');
    btnPrev.disabled = true;
    btnNext.disabled = true;
    section.hidden = true;
    hideClearButton();
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
  function renderAds(ads = []) {
    stopLoadingState();

    if (!Array.isArray(ads) || ads.length < MIN_ADS_TO_DISPLAY) {
      hideSectionAndReset();
      return;
    }

    track.innerHTML = '';
    track.setAttribute('role', 'list');

    ads.forEach((ad) => {
      const card = createAdCard(ad);
      track.appendChild(card);
    });

    section.hidden = false;
    showClearButton();

    setTimeout(updateButtons, 150);
  }

  // ========== CHARGEMENT DES DONNÉES ==========

  /**
   * Charger les annonces récemment vues depuis l'API
   */
  async function loadRecentlyViewedAds(options = {}) {
    if (!isUserLoggedIn()) {
      hideSectionAndReset();
      return;
    }

    startLoading(options);

    try {
      const response = await fetch(buildApiUrl('/users/me/recently-viewed'), {
        credentials: 'include'
      });

      if (!response.ok) {
        hideSectionAndReset();
        return;
      }

      const result = await response.json();
      const ads = result.data?.ads || [];

      if (ads.length >= MIN_ADS_TO_DISPLAY) {
        renderAds(ads);
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
    if (window.__skipRecentlyViewedTracking) {
      return;
    }

    if (!isUserLoggedIn()) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/users/me/recently-viewed'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adId })
      });

      if (response.ok) {
        loadRecentlyViewedAds({ withSkeleton: false });
      } else {
        console.warn('[RecentlyViewed] Tracking non appliqué');
      }
    } catch (error) {
      console.error('[RecentlyViewed] Erreur tracking:', error);
    }
  }

  async function clearRecentlyViewedHistory() {
    if (!btnClear || btnClear.disabled) {
      return;
    }

    setClearButtonLoadingState(true);

    try {
      const response = await fetch(buildApiUrl('/users/me/recently-viewed'), {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Réinitialisation impossible');
      }

      hideSectionAndReset();
      if (typeof window.showToast === 'function') {
        window.showToast('Historique supprimé.');
      } else {
        console.info("Historique 'Récemment vus' supprimé.");
      }
    } catch (error) {
      console.error('[RecentlyViewed] Erreur suppression historique:', error);
      setClearButtonLoadingState(false);
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

    if (btnClear) {
      btnClear.addEventListener('click', clearRecentlyViewedHistory);
    }

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
    loadRecentlyViewedAds,
    clearRecentlyViewedHistory
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
