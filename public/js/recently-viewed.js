/**
 * Module pour gérer les annonces récemment vues
 */
(function () {
  'use strict';

  // Configuration
  const SCROLL_AMOUNT = 500; // Pixels à défiler

  /**
   * Charger et afficher les annonces récemment vues
   */
  async function loadRecentlyViewedAds() {
    const section = document.getElementById('recentlyViewedSection');

    try {
      const response = await fetch('/api/users/me/recently-viewed', {
        credentials: 'include'
      });

      if (!response.ok) {
        console.log('[RecentlyViewed] Response not OK:', response.status);
        if (section) section.hidden = true;
        return;
      }

      const result = await response.json();
      console.log('[RecentlyViewed] Loaded ads:', result.data?.ads?.length || 0);

      if (result.status === 'success' && result.data?.ads?.length > 0) {
        renderRecentlyViewedAds(result.data.ads);
        if (section) {
          section.hidden = false;
          console.log('[RecentlyViewed] Section displayed with', result.data.ads.length, 'ads');
          console.log('[RecentlyViewed] Section hidden status:', section.hidden);
          console.log(
            '[RecentlyViewed] Section hasAttribute("hidden"):',
            section.hasAttribute('hidden')
          );

          const styles = window.getComputedStyle(section);
          console.log('[RecentlyViewed] Section computed display:', styles.display);
          console.log('[RecentlyViewed] Section computed visibility:', styles.visibility);
          console.log('[RecentlyViewed] Section computed opacity:', styles.opacity);
          console.log('[RecentlyViewed] Section computed height:', styles.height);
          console.log('[RecentlyViewed] Section offsetHeight:', section.offsetHeight);
          console.log('[RecentlyViewed] Section offsetWidth:', section.offsetWidth);
          console.log('[RecentlyViewed] Section position:', section.getBoundingClientRect());
        } else {
          console.error('[RecentlyViewed] Section element not found!');
        }
      } else {
        console.log('[RecentlyViewed] No ads to display');
        if (section) section.hidden = true;
      }
    } catch (error) {
      console.error('[RecentlyViewed] Error loading ads:', error);
      if (section) section.hidden = true;
    }
  }

  /**
   * Afficher les annonces dans le carrousel
   */
  function renderRecentlyViewedAds(ads) {
    console.log('[RecentlyViewed] renderRecentlyViewedAds appelé avec', ads.length, 'annonces');
    const track = document.getElementById('recentlyViewedTrack');
    if (!track) {
      console.error('[RecentlyViewed] Element recentlyViewedTrack non trouvé !');
      return;
    }

    console.log('[RecentlyViewed] Track trouvé, vidage et ajout des cartes...');
    track.innerHTML = '';

    ads.forEach((ad, index) => {
      console.log(`[RecentlyViewed] Création de la carte ${index + 1}:`, ad.title);
      const card = createAdCard(ad);
      track.appendChild(card);
    });

    console.log('[RecentlyViewed] Toutes les cartes ajoutées au track');
    console.log("[RecentlyViewed] Nombre d'enfants dans track:", track.children.length);

    // Réattacher les event listeners après le rendu
    initEventListeners();

    // Mettre à jour les boutons après le rendu
    setTimeout(updateNavigationButtons, 150);
  }

  /**
   * Créer une carte d'annonce pour le carrousel
   */
  function createAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'carousel-card';
    card.dataset.adId = ad._id;

    // Utiliser la première thumbnail ou l'image principale
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

    // Ajouter le gestionnaire de clic pour ouvrir l'annonce
    card.addEventListener('click', () => {
      openAdDetails(ad._id);
    });

    return card;
  }

  /**
   * Ouvrir les détails d'une annonce
   */
  function openAdDetails(adId) {
    // Marquer temporairement que le clic vient de la section "récemment vu"
    // pour éviter de réinjecter l'annonce dans la liste
    window.__skipRecentlyViewedTracking = true;

    // Utiliser la fonction globale existante pour ouvrir l'annonce
    if (typeof window.openDetailsById === 'function') {
      window.openDetailsById(adId);
    } else {
      console.warn('openDetailsById function not found');
    }

    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      window.__skipRecentlyViewedTracking = false;
    }, 1000);
  }

  /**
   * Échapper les caractères HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Naviguer dans le carrousel (précédent)
   */
  function scrollPrev() {
    console.log('[RecentlyViewed] scrollPrev appelé');
    const track = document.getElementById('recentlyViewedTrack');
    if (!track) {
      console.warn('[RecentlyViewed] scrollPrev: track non trouvé');
      return;
    }

    console.log('[RecentlyViewed] Scroll vers la gauche de', SCROLL_AMOUNT, 'px');
    track.scrollBy({
      left: -SCROLL_AMOUNT,
      behavior: 'smooth'
    });

    // Mettre à jour les boutons après un court délai
    setTimeout(updateNavigationButtons, 300);
  }

  /**
   * Naviguer dans le carrousel (suivant)
   */
  function scrollNext() {
    console.log('[RecentlyViewed] scrollNext appelé');
    const track = document.getElementById('recentlyViewedTrack');
    if (!track) {
      console.warn('[RecentlyViewed] scrollNext: track non trouvé');
      return;
    }

    console.log('[RecentlyViewed] Scroll vers la droite de', SCROLL_AMOUNT, 'px');
    track.scrollBy({
      left: SCROLL_AMOUNT,
      behavior: 'smooth'
    });

    // Mettre à jour les boutons après un court délai
    setTimeout(updateNavigationButtons, 300);
  }

  /**
   * Mettre à jour l'état des boutons de navigation
   */
  function updateNavigationButtons() {
    const track = document.getElementById('recentlyViewedTrack');
    const prevButton = document.getElementById('recentlyViewedPrev');
    const nextButton = document.getElementById('recentlyViewedNext');

    if (!track || !prevButton || !nextButton) {
      console.warn('[RecentlyViewed] updateNavigationButtons: éléments manquants', {
        track: !!track,
        prevButton: !!prevButton,
        nextButton: !!nextButton
      });
      return;
    }

    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;

    console.log('[RecentlyViewed] updateNavigationButtons:', {
      scrollLeft,
      maxScroll,
      scrollWidth: track.scrollWidth,
      clientWidth: track.clientWidth
    });

    // Désactiver le bouton précédent si on est au début
    prevButton.disabled = scrollLeft <= 5;
    prevButton.style.opacity = prevButton.disabled ? '0.3' : '1';

    // Désactiver le bouton suivant si on est à la fin
    nextButton.disabled = scrollLeft >= maxScroll - 5;
    nextButton.style.opacity = nextButton.disabled ? '0.3' : '1';
  }

  /**
   * Écouter les événements de défilement
   */
  function handleScroll() {
    updateNavigationButtons();
  }

  /**
   * Enregistrer qu'un utilisateur a vu une annonce
   */
  async function trackAdView(adId) {
    // Vérifier si on doit ignorer le tracking (clic depuis la section "récemment vu")
    if (window.__skipRecentlyViewedTracking) {
      console.log('[RecentlyViewed] Tracking skipped for:', adId);
      return;
    }

    // Ne pas tracker si l'utilisateur n'est pas connecté
    if (!isUserLoggedIn()) {
      return;
    }

    try {
      console.log('[RecentlyViewed] Tracking view for ad:', adId);
      const response = await fetch('/api/users/me/recently-viewed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ adId })
      });

      if (response.ok) {
        console.log('[RecentlyViewed] View tracked successfully');
        // Recharger les annonces récemment vues pour mettre à jour l'affichage
        loadRecentlyViewedAds();
      } else {
        console.log('[RecentlyViewed] Failed to track view:', response.status);
      }
    } catch (error) {
      console.error('[RecentlyViewed] Error tracking view:', error);
    }
  }

  /**
   * Initialiser les gestionnaires d'événements
   */
  function initEventListeners() {
    console.log('[RecentlyViewed] Initialisation des event listeners...');
    const prevButton = document.getElementById('recentlyViewedPrev');
    const nextButton = document.getElementById('recentlyViewedNext');
    const track = document.getElementById('recentlyViewedTrack');

    console.log('[RecentlyViewed] prevButton:', !!prevButton);
    console.log('[RecentlyViewed] nextButton:', !!nextButton);
    console.log('[RecentlyViewed] track:', !!track);

    if (prevButton) {
      // Retirer l'ancien listener s'il existe
      prevButton.removeEventListener('click', scrollPrev);
      // Ajouter le nouveau listener
      prevButton.addEventListener('click', (e) => {
        console.log('[RecentlyViewed] Click détecté sur prevButton');
        e.preventDefault();
        e.stopPropagation();
        scrollPrev();
      });
      console.log('[RecentlyViewed] Event listener ajouté sur prevButton');
      console.log('[RecentlyViewed] prevButton disabled?', prevButton.disabled);
      console.log(
        '[RecentlyViewed] prevButton style:',
        window.getComputedStyle(prevButton).display
      );
    } else {
      console.warn('[RecentlyViewed] prevButton non trouvé !');
    }

    if (nextButton) {
      // Retirer l'ancien listener s'il existe
      nextButton.removeEventListener('click', scrollNext);
      // Ajouter le nouveau listener
      nextButton.addEventListener('click', (e) => {
        console.log('[RecentlyViewed] Click détecté sur nextButton');
        e.preventDefault();
        e.stopPropagation();
        scrollNext();
      });
      console.log('[RecentlyViewed] Event listener ajouté sur nextButton');
      console.log('[RecentlyViewed] nextButton disabled?', nextButton.disabled);
      console.log(
        '[RecentlyViewed] nextButton style:',
        window.getComputedStyle(nextButton).display
      );
    } else {
      console.warn('[RecentlyViewed] nextButton non trouvé !');
    }

    if (track) {
      // Retirer l'ancien listener s'il existe
      track.removeEventListener('scroll', handleScroll);
      // Ajouter le nouveau listener
      track.addEventListener('scroll', handleScroll);
      console.log('[RecentlyViewed] Event listener scroll ajouté sur track');
    } else {
      console.warn('[RecentlyViewed] track non trouvé !');
    }
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  function isUserLoggedIn() {
    // Vérifier via authStore (comme les autres modules)
    try {
      console.log('[RecentlyViewed] Vérification authStore...');
      console.log('[RecentlyViewed] window.authStore existe?', !!window.authStore);

      const authUser = window.authStore?.get();
      console.log('[RecentlyViewed] authUser:', authUser);
      console.log('[RecentlyViewed] authUser._id:', authUser?._id);

      const isLoggedIn = authUser && (authUser._id || authUser.id);
      console.log('[RecentlyViewed] isLoggedIn:', isLoggedIn);

      return isLoggedIn;
    } catch (error) {
      console.warn('[RecentlyViewed] Erreur lors de la vérification de connexion:', error);
      return false;
    }
  }

  /**
   * Initialiser le module
   */
  function init() {
    console.log('[RecentlyViewed] Initialisation du module');

    // Ne rien faire si l'utilisateur n'est pas connecté
    if (!isUserLoggedIn()) {
      console.log('[RecentlyViewed] Utilisateur non connecté');
      const section = document.getElementById('recentlyViewedSection');
      if (section) section.hidden = true;
      return;
    }

    console.log('[RecentlyViewed] Utilisateur connecté, initialisation des listeners');
    initEventListeners();

    // Charger les annonces après un court délai
    setTimeout(() => {
      console.log('[RecentlyViewed] Chargement des annonces...');
      loadRecentlyViewedAds();
    }, 1000);
  }

  // Exposer les fonctions nécessaires globalement
  window.recentlyViewed = {
    trackAdView,
    loadRecentlyViewedAds
  };

  // Attendre que authStore soit disponible avant d'initialiser
  console.log('[RecentlyViewed] Script chargé');

  function waitForAuthStore() {
    if (window.authStore) {
      console.log('[RecentlyViewed] authStore disponible, initialisation...');
      init();
    } else {
      console.log('[RecentlyViewed] En attente de authStore...');
      setTimeout(waitForAuthStore, 50);
    }
  }

  // Écouter les changements d'authentification
  document.addEventListener('auth:change', (event) => {
    console.log('[RecentlyViewed] Événement auth:change reçu', event.detail);

    // Si l'utilisateur vient de se connecter, charger les annonces
    if (event.detail && event.detail._id) {
      console.log('[RecentlyViewed] Utilisateur connecté, rechargement des annonces...');
      init();
    } else {
      // Si l'utilisateur s'est déconnecté, masquer la section
      console.log('[RecentlyViewed] Utilisateur déconnecté, masquage de la section...');
      const section = document.getElementById('recentlyViewedSection');
      if (section) section.hidden = true;
    }
  });

  // Si le DOM est déjà chargé, attendre authStore, sinon attendre le DOM puis authStore
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForAuthStore);
  } else {
    waitForAuthStore();
  }
})();
