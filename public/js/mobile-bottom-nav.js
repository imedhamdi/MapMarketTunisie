/**
 * Mobile Bottom Navigation - Synchronisation et interactions
 * Synchronise la bottom nav mobile avec les actions du header desktop
 */
(function () {
  // Ne s'exécuter que sur mobile
  if (window.innerWidth > 767) return;

  // Synchroniser le bouton Messages
  const mobileNavMessages = document.getElementById('mobileNavMessages');
  const navMessages = document.getElementById('navMessages');
  if (mobileNavMessages && navMessages) {
    mobileNavMessages.addEventListener('click', (e) => {
      e.preventDefault();
      navMessages.click();
    });
  }

  // Synchroniser le bouton Favoris
  const mobileOpenFavs = document.getElementById('mobileOpenFavs');
  const openFavs = document.getElementById('openFavs');
  if (mobileOpenFavs && openFavs) {
    mobileOpenFavs.addEventListener('click', () => {
      openFavs.click();
    });
  }

  // Synchroniser le bouton Publier
  const mobilePostBtn = document.getElementById('mobilePostBtn');
  const postBtn = document.getElementById('postBtn');
  if (mobilePostBtn && postBtn) {
    mobilePostBtn.addEventListener('click', () => {
      postBtn.click();
    });
  }

  // Synchroniser le bouton Profil avec l'avatar
  // Utilise une délégation d'événement pour gérer le bouton même s'il est rendu dynamiquement
  const mobileNavProfile = document.getElementById('mobileNavProfile');

  if (mobileNavProfile) {
    mobileNavProfile.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Utiliser exactement le même déclencheur que l'avatar du header (menu ou auth)
      const headerAvatarBtn = document.querySelector('.header-user .avatar .avatar-btn');
      const userMenuButton = document.getElementById('userMenuButton');
      const isAuthenticated =
        (headerAvatarBtn && headerAvatarBtn.classList.contains('is-auth')) ||
        (userMenuButton && userMenuButton.classList.contains('is-auth'));
      const userMenu = document.getElementById('userMenu');

      // Préparer le menu pour un affichage ancré en bas (mobile)
      if (userMenu) {
        if (userMenu.parentElement !== document.body) {
          document.body.appendChild(userMenu);
        }
        const rect = mobileNavProfile.getBoundingClientRect();
        const anchorX = rect.left + rect.width / 2;
        userMenu.dataset.origin = 'mobile';
        userMenu.classList.add('user-menu--mobile');
        userMenu.style.setProperty('--user-menu-anchor', `${Math.round(anchorX)}px`);
      }

      // Cas connecté : ouvrir/fermer le menu utilisateur
      if (isAuthenticated) {
        if (typeof window.toggleUserMenu === 'function') {
          window.toggleUserMenu();
          return;
        }

        if (userMenuButton) {
          if (userMenuButton.__menuToggleHandler) {
            userMenuButton.__menuToggleHandler();
          } else {
            userMenuButton.click();
          }
          return;
        }

        if (headerAvatarBtn) {
          headerAvatarBtn.click();
          return;
        }
      }

      // Cas non connecté : réutiliser le bouton d'authentification
      if (headerAvatarBtn) {
        headerAvatarBtn.click();
        return;
      }

      // Dernier recours : bouton d'auth manquant
      setTimeout(() => {
        const needsAuthBtn = document.querySelector('.avatar-btn.needs-auth');
        if (needsAuthBtn) {
          needsAuthBtn.click();
        }
      }, 50);
    });
  }

  // Synchroniser les badges de notification
  function syncBadges() {
    const messagesNavBadge = document.getElementById('messagesNavBadge');
    const mobileMessagesNavBadge = document.getElementById('mobileMessagesNavBadge');
    const favCount = document.getElementById('fav-count');
    const mobileFavCount = document.getElementById('mobileFavCount');

    if (messagesNavBadge && mobileMessagesNavBadge) {
      const count = messagesNavBadge.textContent;
      const isHidden = messagesNavBadge.hasAttribute('hidden');

      mobileMessagesNavBadge.textContent = count;
      if (isHidden) {
        mobileMessagesNavBadge.setAttribute('hidden', '');
      } else {
        mobileMessagesNavBadge.removeAttribute('hidden');
      }
    }

    if (favCount && mobileFavCount) {
      const count = favCount.textContent;
      mobileFavCount.textContent = count;

      if (count === '0') {
        mobileFavCount.setAttribute('hidden', '');
      } else {
        mobileFavCount.removeAttribute('hidden');
      }
    }
  }

  // Observer les changements sur les badges
  const messagesNavBadge = document.getElementById('messagesNavBadge');
  const favCount = document.getElementById('fav-count');

  if (messagesNavBadge) {
    const observer = new MutationObserver(syncBadges);
    observer.observe(messagesNavBadge, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (favCount) {
    const observer = new MutationObserver(syncBadges);
    observer.observe(favCount, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  // Sync initial
  syncBadges();

  // Gérer l'état actif de la navigation
  const navItems = document.querySelectorAll(
    '.mobile-bottom-nav__item:not(.mobile-bottom-nav__item--primary)'
  );
  navItems.forEach((item) => {
    item.addEventListener('click', function () {
      // Retirer l'état actif de tous les items sauf le bouton principal
      navItems.forEach((i) => {
        i.classList.remove('mobile-bottom-nav__item--active');
        i.removeAttribute('aria-current');
      });

      // Ajouter l'état actif à l'item cliqué (sauf pour Messages et Favoris qui ouvrent des modals)
      if (this.id === 'mobileNavExplore' || this.id === 'mobileNavProfile') {
        this.classList.add('mobile-bottom-nav__item--active');
        this.setAttribute('aria-current', 'page');
      }
    });
  });

  // Ajuster le padding bottom du main pour éviter que le contenu soit caché par la navbar
  const main = document.querySelector('main');
  if (main) {
    main.style.paddingBottom = 'calc(80px + env(safe-area-inset-bottom, 0px))';
  }

  // Effet tactile amélioré
  navItems.forEach((item) => {
    item.addEventListener('touchstart', function () {
      this.style.transition = 'transform 0.1s ease';
    });

    item.addEventListener('touchend', function () {
      this.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  });
})();
