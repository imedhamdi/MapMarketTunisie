/**
 * Module pour gérer les annonces récemment vues
 * SCOPE: Section #recentlyViewedSection uniquement
 * Ne touche PAS aux carrousels d'images des cartes d'annonces
 */
(function initRecentlyViewedSection() {
  'use strict';

  // ========== CONFIGURATION ==========
  const SECTION_ID = 'recentlyViewedSection';
  const TRACK_ID = 'recentlyViewedTrack';
  const BTN_PREV_ID = 'recentlyViewedPrev';
  const BTN_NEXT_ID = 'recentlyViewedNext';
  const SCROLL_STEP = 320; // Largeur approx. d'une carte + gap (ajuster si besoin)

  // ========== SÉLECTEURS SCOPÉS ==========
  const section = document.getElementById(SECTION_ID);
  if (!section) {
    console.warn('[RecentlyViewed] Section non trouvée, module non initialisé');
    return;
  }

  const track = section.querySelector(`#${TRACK_ID}`);
  const btnPrev = section.querySelector(`#${BTN_PREV_ID}`);
  const btnNext = section.querySelector(`#${BTN_NEXT_ID}`);

  if (!track || !btnPrev || !btnNext) {
    console.warn('[RecentlyViewed] Éléments manquants, module non initialisé', {
      track: !!track,
      btnPrev: !!btnPrev,
      btnNext: !!btnNext
    });
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
      console.warn('[RecentlyViewed] Erreur vérification connexion:', error);
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
    ads.forEach((ad, index) => {
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
      const response = await fetch('/api/users/me/recently-viewed', {
        credentials: 'include'
      });

      if (!response.ok) {
        // ...existing code...
        section.hidden = true;
        return;
      }

      const result = await response.json();
      const ads = result.data?.ads || [];

      // ...existing code...

      if (ads.length > 5) {
        renderAds(ads);
        section.hidden = false;
      } else {
        section.hidden = true;
      }
    } catch (error) {
      console.error('[RecentlyViewed] Erreur chargement:', error);
      section.hidden = true;
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
      const response = await fetch('/api/users/me/recently-viewed', {
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
      section.hidden = true;
      return;
    }

    // ...existing code...

    // Attacher les listeners
    attachListeners();

    // Charger les annonces après un délai
    setTimeout(() => {
      loadRecentlyViewedAds();
    }, 1000);
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
      section.hidden = true;
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
