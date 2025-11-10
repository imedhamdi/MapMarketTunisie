/**
 * WHY MAPMARKET - Animations & Interactions Premium
 *
 * Features:
 * - Intersection Observer pour animations au scroll
 * - Counter animations avec easing
 * - Mouse tracking pour effet lumineux
 * - Performance optimisée
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. INTERSECTION OBSERVER - Animations d'entrée
  // ============================================================================

  const initScrollAnimations = () => {
    const section = document.getElementById('whyMapmarket');
    if (!section) return;

    const cards = section.querySelectorAll('.why-mapmarket__card');
    const stats = section.querySelector('.why-mapmarket__stats');

    // Options pour l'observer
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    // Callback pour les cartes
    const cardsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observer chaque carte
    cards.forEach((card) => {
      cardsObserver.observe(card);
    });

    // Observer les stats pour déclencher les compteurs
    if (stats) {
      const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
            statsObserver.unobserve(entry.target);
          }
        });
      }, observerOptions);

      statsObserver.observe(stats);
    }
  };

  // ============================================================================
  // 2. COUNTER ANIMATIONS - Compteurs animés
  // ============================================================================

  const animateCounters = () => {
    const counters = document.querySelectorAll('[data-counter]');

    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.counter, 10);
      const duration = 2000; // 2 secondes
      const frameDuration = 1000 / 60; // 60 FPS
      const totalFrames = Math.round(duration / frameDuration);
      let frame = 0;

      const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

      const updateCounter = () => {
        frame++;
        const progress = easeOutQuart(frame / totalFrames);
        const currentCount = Math.round(target * progress);

        // Formatage selon le type de donnée
        if (counter.textContent.includes('%') || target === 98) {
          counter.textContent = `${currentCount}%`;
        } else if (target === 24) {
          counter.textContent = `${currentCount}h`;
        } else {
          counter.textContent = currentCount.toLocaleString('fr-FR');
        }

        if (frame < totalFrames) {
          requestAnimationFrame(updateCounter);
        } else {
          // Valeur finale
          if (counter.textContent.includes('%') || target === 98) {
            counter.textContent = `${target}%`;
          } else if (target === 24) {
            counter.textContent = `${target}h`;
          } else {
            counter.textContent = target.toLocaleString('fr-FR');
          }
        }
      };

      requestAnimationFrame(updateCounter);
    });
  };

  // ============================================================================
  // 3. MOUSE TRACKING - Effet lumineux au survol
  // ============================================================================

  const initMouseTracking = () => {
    const cards = document.querySelectorAll('.why-mapmarket__card');

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        card.style.setProperty('--mouse-x', `${x}%`);
        card.style.setProperty('--mouse-y', `${y}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
      });
    });
  };

  // ============================================================================
  // 4. PARALLAX SUBTIL - Effet de profondeur
  // ============================================================================

  const initParallax = () => {
    const section = document.getElementById('whyMapmarket');
    if (!section) return;

    let ticking = false;

    const updateParallax = () => {
      const scrolled = window.pageYOffset;
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      // Seulement si la section est visible
      if (scrolled + window.innerHeight > sectionTop && scrolled < sectionTop + sectionHeight) {
        const offset = (scrolled - sectionTop) * 0.3;
        section.style.setProperty('--parallax-offset', `${offset}px`);
      }

      ticking = false;
    };

    const requestParallax = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    // Throttle scroll events
    window.addEventListener('scroll', requestParallax, { passive: true });
  };

  // ============================================================================
  // 5. ACCESSIBILITY - Support clavier & reduced motion
  // ============================================================================

  const initAccessibility = () => {
    // Respecter prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReducedMotion.matches) {
      // Désactiver toutes les animations
      document.querySelectorAll('.why-mapmarket__card').forEach((card) => {
        card.style.animation = 'none';
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
      return;
    }

    // Support navigation clavier sans outline visible
    const cards = document.querySelectorAll('.why-mapmarket__card');
    cards.forEach((card) => {
      card.setAttribute('tabindex', '0');
    });
  };

  // ============================================================================
  // 6. PERFORMANCE OPTIMIZATION
  // ============================================================================

  const optimizePerformance = () => {
    // Lazy load des animations si la section n'est pas immédiatement visible
    const section = document.getElementById('whyMapmarket');
    if (!section) return;

    const sectionTop = section.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    // Si la section est en bas de page, initialiser seulement au scroll
    if (sectionTop > windowHeight * 2) {
      const initOnce = () => {
        initMouseTracking();
        initParallax();
        window.removeEventListener('scroll', initOnce);
      };
      window.addEventListener('scroll', initOnce, { once: true, passive: true });
    } else {
      initMouseTracking();
      initParallax();
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const init = () => {
    // Vérifier que le DOM est prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Vérifier que la section existe
    const section = document.getElementById('whyMapmarket');
    if (!section) {
      console.warn('Why MapMarket section not found');
      return;
    }

    // Initialiser les features
    initScrollAnimations();
    initAccessibility();
    optimizePerformance();
  };

  // Start
  init();
})();
