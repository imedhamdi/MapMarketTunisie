/**
 * JOIN COMMUNITY - Interactions minimalistes
 *
 * Animations subtiles et discrètes pour une expérience épurée
 */

(function () {
  'use strict';

  // ============================================================================
  // COUNTER ANIMATION
  // ============================================================================

  const animateCounters = () => {
    const counters = document.querySelectorAll('[data-counter]');

    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.counter, 10);
      const duration = 1500;
      const frameDuration = 1000 / 60;
      const totalFrames = Math.round(duration / frameDuration);
      let frame = 0;

      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      const updateCounter = () => {
        frame++;
        const progress = easeOut(frame / totalFrames);
        const currentCount = Math.round(target * progress);

        counter.textContent = currentCount.toLocaleString('fr-FR');

        if (frame < totalFrames) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target.toLocaleString('fr-FR');
        }
      };

      requestAnimationFrame(updateCounter);
    });
  };

  // ============================================================================
  // INTERSECTION OBSERVER
  // ============================================================================

  const initObserver = () => {
    const section = document.getElementById('joinCommunity');
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
  };

  // ============================================================================
  // CTA BUTTON
  // ============================================================================

  const initCTA = () => {
    const btn = document.getElementById('joinCommunityBtn');
    const ctaWrapper = document.querySelector('.join-community__cta-wrapper');
    if (!btn) return;

    // Vérifier si l'utilisateur est connecté via la clé mm-auth
    const checkAuthAndToggleButton = () => {
      let isLoggedIn = false;
      try {
        const mmAuth = localStorage.getItem('mm-auth');
        if (mmAuth) {
          const user = JSON.parse(mmAuth);
          isLoggedIn = !!(user && user._id);
        }
      } catch (e) {}
      if (isLoggedIn) {
        btn.style.display = 'none';
        if (ctaWrapper) ctaWrapper.style.display = 'none';
      } else {
        btn.style.display = '';
        if (ctaWrapper) ctaWrapper.style.display = '';
      }
    };

    // Vérifier au chargement
    checkAuthAndToggleButton();

    // Écouter les changements de localStorage (connexion/déconnexion)
    window.addEventListener('storage', (e) => {
      if (e.key === 'mm-auth') {
        checkAuthAndToggleButton();
      }
    });

    // Écouter les événements personnalisés de login/logout si dispatchés ailleurs dans l'app
    window.addEventListener('user:login', checkAuthAndToggleButton);
    window.addEventListener('user:logout', checkAuthAndToggleButton);

    // MutationObserver pour détecter les changements dynamiques sur localStorage (fallback)
    let lastAuth = localStorage.getItem('mm-auth');
    setInterval(() => {
      const currentAuth = localStorage.getItem('mm-auth');
      if (currentAuth !== lastAuth) {
        lastAuth = currentAuth;
        checkAuthAndToggleButton();
      }
    }, 1000);

    // Gérer le clic sur le bouton
    btn.addEventListener('click', () => {
      const token = localStorage.getItem('token');

      // Si connecté, ne rien faire (normalement le bouton est caché)
      if (token) {
        return;
      }

      // Si non connecté, ouvrir le modal d'inscription
      const signupTab = document.getElementById('signupTab');
      if (signupTab) {
        signupTab.click();
      }

      // Cliquer sur le bouton "Déposer une annonce" qui ouvrira le modal d'auth
      const postBtn = document.getElementById('postBtn');
      if (postBtn) {
        postBtn.click();
      }
    });
  };

  // ============================================================================
  // INIT
  // ============================================================================

  const init = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    const section = document.getElementById('joinCommunity');
    if (!section) return;

    initObserver();
    initCTA();
  };

  init();
})();
