// ========== PROFILE MODAL (Drawer Style) ==========

function initProfileModal() {
  const logger = window.__APP_LOGGER__ || console;
  const overlay = document.getElementById('profileOverlay');
  const modal = document.getElementById('profileModal');
  const closeBtn = document.getElementById('profileClose');

  if (!modal) {
    logger.warn('Profile modal not found in DOM');
    return;
  }

  if (window.__profileModalInitialized) {
    return;
  }
  window.__profileModalInitialized = true;

  const tabs = Array.from(modal.querySelectorAll('.profile-tab'));
  const panels = {
    overview: modal.querySelector('#tab-overview'),
    analytics: modal.querySelector('#tab-analytics'),
    ads: modal.querySelector('#tab-ads'),
    settings: modal.querySelector('#tab-settings')
  };

  const summaryCard = modal.querySelector('#profileSummaryCard');
  const metricGrid = modal.querySelector('#profileMetricGrid');
  const insightsContainer = modal.querySelector('#profileInsights');
  const activityContainer = modal.querySelector('#profileActivity');

  const analyticsOverview = modal.querySelector('#analyticsOverview');
  const analyticsCategory = modal.querySelector('#analyticsCategory');
  const analyticsStatus = modal.querySelector('#analyticsStatus');
  const analyticsPrices = modal.querySelector('#analyticsPrices');
  const analyticsTopAds = modal.querySelector('#analyticsTopAds');
  const analyticsLocations = modal.querySelector('#analyticsLocations');

  const adsGrid = modal.querySelector('#profileAdsGrid');
  const adsEmpty = modal.querySelector('#profileAdsEmpty');
  const adsFilters = modal.querySelector('#profileAdsFilters');
  const newAdBtn = modal.querySelector('#profileNewAd');
  const emptyCreateBtn = modal.querySelector('#profileEmptyCreate');
  const summaryCreateBtn = modal.querySelector('#profileOpenNewAd');

  const avatarImg = modal.querySelector('#profileAvatar');
  const avatarMini = modal.querySelector('#profileAvatarMini');
  const avatarTrigger = modal.querySelector('#profileAvatarTrigger');
  const avatarInput = modal.querySelector('#profileAvatarInput');
  const memberSinceLabel = modal.querySelector('#profileMemberSince');
  const emailLabel = modal.querySelector('#profileEmail');
  const emailHeader = modal.querySelector('#profileEmailHeader');
  const nameLabel = modal.querySelector('#profileUserName');
  const locationChip = modal.querySelector('#profileLocationChip');
  const statusChip = modal.querySelector('#profileStatusChip');

  const infoForm = modal.querySelector('#profileInfoForm');
  const infoFeedback = modal.querySelector('#profileInfoFeedback');
  const infoSubmit = modal.querySelector('#profileInfoSubmit');
  const nameInput = modal.querySelector('#profileName');
  const emailInput = modal.querySelector('#profileEmailInput');

  const locationForm = modal.querySelector('#profileLocationForm');
  const locationFeedback = modal.querySelector('#profileLocationFeedback');
  const locationSubmit = modal.querySelector('#profileLocationSubmit');
  const cityInput = modal.querySelector('#profileCity');
  const radiusInput = modal.querySelector('#profileRadius');

  const passwordForm = modal.querySelector('#profilePasswordForm');
  const passwordFeedback = modal.querySelector('#profilePasswordFeedback');
  const passwordSubmit = modal.querySelector('#profilePasswordSubmit');
  const currentPasswordError = modal.querySelector('#currentPasswordError');
  const newPasswordError = modal.querySelector('#newPasswordError');
  const confirmPasswordError = modal.querySelector('#confirmPasswordError');

  const state = {
    activeTab: 'overview',
    filter: 'all',
    stats: null,
    analytics: null,
    ads: []
  };

  const numberFormatter = new Intl.NumberFormat('fr-FR');
  const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const DEFAULT_AVATAR = '/uploads/avatars/default.jpg';

  function resolveAvatarSrc(rawValue) {
    if (typeof window.getAvatarUrl === 'function') {
      return window.getAvatarUrl(rawValue);
    }
    if (!rawValue) {
      return DEFAULT_AVATAR;
    }
    if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith('/')) {
      return rawValue;
    }
    return `/uploads/avatars/${rawValue}`;
  }

  function setAvatarSource(image, rawValue) {
    if (!image) return;
    const resolved = resolveAvatarSrc(rawValue);
    if (image.dataset.fallbackApplied) {
      delete image.dataset.fallbackApplied;
    }
    image.src = resolved;
  }

  function applyAvatarFallback(image) {
    if (!image) return;
    image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.src = DEFAULT_AVATAR;
    });
  }

  applyAvatarFallback(avatarImg);
  applyAvatarFallback(avatarMini);

  const getApi = () =>
    window.api || {
      async request(url, options = {}) {
        const response = await fetch(url, {
          credentials: 'include',
          ...options
        });
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : await response.text();
        if (!response.ok) {
          const message =
            (typeof payload === 'object' && payload?.message) ||
            response.statusText ||
            'Erreur réseau';
          const error = new Error(message);
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      },
      async get(url) {
        return this.request(url);
      },
      async post(url, data, options = {}) {
        const resolvedBody = options.body ?? data;
        const isFormData = resolvedBody instanceof FormData;
        const headers =
          options.headers ||
          (isFormData ? undefined : { 'Content-Type': 'application/json' });
        const body =
          resolvedBody === undefined
            ? undefined
            : isFormData
            ? resolvedBody
            : JSON.stringify(resolvedBody);
        return this.request(url, {
          method: 'POST',
          headers,
          body
        });
      },
      async patch(url, data, options = {}) {
        const resolvedBody = options.body ?? data;
        const isFormData = resolvedBody instanceof FormData;
        const headers =
          options.headers ||
          (isFormData ? undefined : { 'Content-Type': 'application/json' });
        const body =
          resolvedBody === undefined
            ? undefined
            : isFormData
            ? resolvedBody
            : JSON.stringify(resolvedBody);
        return this.request(url, {
          method: 'PATCH',
          headers,
          body
        });
      },
      async delete(url, options = {}) {
        const resolvedBody = options.body ?? options.data;
        const isFormData = resolvedBody instanceof FormData;
        const headers =
          options.headers ||
          (isFormData ? undefined : resolvedBody !== undefined ? { 'Content-Type': 'application/json' } : undefined);
        const body =
          resolvedBody === undefined
            ? undefined
            : isFormData
            ? resolvedBody
            : JSON.stringify(resolvedBody);
        return this.request(url, {
          method: 'DELETE',
          headers,
          body
        });
      }
    };

  // Drawer-style open/close (like Favorites modal)
  function openModal() {
    overlay.classList.add('active');
    modal.classList.add('mm-open');
    modal.setAttribute('aria-hidden', 'false');
    
    // Obscure map if exists
    const map = document.getElementById('map');
    if (map) map.classList.add('is-obscured');

    fetchProfileData();
  }

  function closeModal() {
    overlay.classList.remove('active');
    modal.classList.remove('mm-open');
    modal.setAttribute('aria-hidden', 'true');

    // Remove map obscure
    const map = document.getElementById('map');
    if (map) map.classList.remove('is-obscured');
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value || 0));
  }

  function formatCurrency(value) {
    return currencyFormatter.format(Number(value || 0));
  }

  function formatPercent(value) {
    const percent = Number(value || 0);
    return `${percent.toFixed(1).replace('.', ',')}%`;
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      return dateFormatter.format(new Date(value));
    } catch (error) {
      return '—';
    }
  }

  function timeAgo(value) {
    if (!value) return '';
    const date = new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "à l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `il y a ${weeks} sem.`;
    return dateFormatter.format(date);
  }

  function computeRatio(value, total) {
    const numericValue = Number(value) || 0;
    const numericTotal = Number(total) || 0;
    if (numericValue <= 0) {
      return 0;
    }
    if (numericTotal <= 0) {
      return 1;
    }
    return Math.min(numericValue / numericTotal, 1);
  }

  function switchTab(tabName) {
    if (!tabName || !panels[tabName]) return;
    state.activeTab = tabName;
    tabs.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
      btn.setAttribute('aria-selected', btn.dataset.tab === tabName ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([key, panel]) => {
      panel?.classList.toggle('active', key === tabName);
    });
  }


  function setLoading() {
    if (insightsContainer) insightsContainer.innerHTML = '';
    if (activityContainer) activityContainer.innerHTML = '<p class="profile-empty__text">Chargement…</p>';
    if (analyticsOverview) analyticsOverview.innerHTML = '<div class="analytics-pill">Chargement…</div>';
    if (analyticsCategory) analyticsCategory.innerHTML = '';
    if (analyticsStatus) analyticsStatus.innerHTML = '';
    if (analyticsPrices) analyticsPrices.innerHTML = '';
    analyticsTopAds.innerHTML = '';
    analyticsLocations.innerHTML = '';
  }

  async function loadDashboard() {
    const api = getApi();
    const user = window.authStore?.get();
    if (!user?._id) {
      return;
    }

    setLoading();

    try {
      const [statsRes, analyticsRes, adsRes] = await Promise.all([
        api.get('/api/users/me/stats'),
        api.get('/api/users/me/analytics'),
        api.get(`/api/ads?owner=${user._id}&status=all&limit=120&sort=-createdAt`)
      ]);

      state.stats = statsRes?.data?.stats || null;
      state.analytics = analyticsRes?.data?.analytics || null;
      state.ads = adsRes?.data?.items || [];

      renderSummary(user);
      renderMetrics();
      renderInsights();
      renderActivity();
      renderAnalytics();
      renderAds();
    } catch (error) {
      logger.error('Error loading profile dashboard', error);
      insightsContainer.innerHTML = '<p class="profile-empty__text">Impossible de charger les données.</p>';
    }
  }

  function renderSummary(user) {
    if (!user) return;
    nameLabel.textContent = user.name || 'Utilisateur';
    emailLabel.textContent = user.email || '—';
    if (memberSinceLabel) {
      memberSinceLabel.textContent = user.memberSince
        ? `Membre depuis ${formatDate(user.memberSince)}`
        : 'Membre depuis —';
    }

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (cityInput) cityInput.value = user.location?.city || '';
    if (radiusInput) radiusInput.value = user.location?.radiusKm || 10;

    const locationText = user.location?.city || 'Localisation non renseignée';
    if (locationChip) locationChip.textContent = locationText;

    const activeAds = state.stats?.summary?.activeAds ?? 0;
    if (statusChip) {
      statusChip.textContent = `${formatNumber(activeAds)} annonces actives`;
    }

    const avatarValue = user.avatarUrl || user.avatar;
    setAvatarSource(avatarImg, avatarValue);
  }

  function renderMetrics() {
    const summary = state.stats?.summary;
    const engagement = state.stats?.engagement;
    if (!summary) {
      metricGrid.innerHTML = '';
      return;
    }

    const metrics = [
      { label: 'Annonces actives', value: summary.activeAds, accent: true },
      { label: 'Brouillons', value: summary.draftAds },
      { label: 'Archivées', value: summary.archivedAds },
      { label: 'Vues totales', value: summary.totalViews },
      { label: 'Favoris totaux', value: summary.totalFavorites },
      { label: 'Valeur du catalogue', value: formatCurrency(summary.inventoryValue) },
      { label: 'Prix moyen', value: formatCurrency(summary.averagePrice) },
      { label: 'Vues moy./annonce', value: engagement ? engagement.averageViews : 0 }
    ];

    metricGrid.innerHTML = metrics
      .map((metric) => {
        const display = typeof metric.value === 'string' ? metric.value : formatNumber(metric.value);
        return `
          <div class="profile-metric${metric.accent ? ' accent' : ''}">
            <span class="profile-metric__label">${metric.label}</span>
            <span class="profile-metric__value">${display}</span>
          </div>
        `;
      })
      .join('');
  }


  // Gestion du bouton de suppression de compte (présent uniquement dans l'onglet aperçu)
  const deleteAccountBtn = modal.querySelector('#deleteAccountBtn');
  const deleteAccountFeedback = modal.querySelector('#deleteAccountFeedback');

  deleteAccountBtn?.addEventListener('click', async () => {
    const user = window.authStore?.get();
    if (!user?._id) {
      window.showToast?.('Vous devez être connecté pour cette action', 'danger');
      return;
    }

    let confirmed = true;
    if (typeof window.showConfirmDialog === 'function') {
      confirmed = await window.showConfirmDialog({
        title: '🗑️ Supprimer votre compte ?',
        message:
          'Êtes-vous sûr de vouloir supprimer votre compte ?\nCette action est irréversible.',
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler'
      });
    } else {
      confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.');
    }
    if (!confirmed) return;

    deleteAccountBtn.disabled = true;
    if (deleteAccountFeedback) {
      deleteAccountFeedback.style.display = 'block';
      deleteAccountFeedback.textContent = 'Suppression en cours…';
    }

    try {
      const api = getApi();
      await api.delete('/api/users/me');
      if (deleteAccountFeedback) {
        deleteAccountFeedback.textContent = 'Votre compte est désactivé. Déconnexion en cours…';
      }
      window.authStore?.set(null);
      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      }
      window.showToast?.('Compte supprimé ✅');
      closeProfileModal();
      setTimeout(() => {
        window.location.reload();
      }, 1600);
    } catch (error) {
      const payloadMessage =
        typeof error?.payload === 'string' ? error.payload : error?.payload?.message;
      const message =
        payloadMessage ||
        error?.message ||
        "Erreur lors de la suppression du compte.";
      if (deleteAccountFeedback) {
        deleteAccountFeedback.textContent = message;
      } else {
        window.showToast?.(message, 'danger');
      }
    } finally {
      deleteAccountBtn.disabled = false;
    }
  });

  function renderInsights() {
    const insights = state.analytics?.insights || [];
    if (!insights.length) {
      insightsContainer.innerHTML = '';
      return;
    }

    insightsContainer.innerHTML = insights
      .map(
        (text) => `
        <div class="profile-insights__card">
          <span>✨</span>
          <div>${text}</div>
        </div>
      `
      )
      .join('');
  }

  function renderActivity() {
    const activity = state.stats?.recentActivity || [];
    if (!activity.length) {
      activityContainer.innerHTML = '<p class="profile-empty__text">Aucune activité récente.</p>';
      return;
    }

    activityContainer.innerHTML = activity
      .map((item) => {
        const statusIcon = item.status === 'active' ? '✅' : item.status === 'draft' ? '📝' : '📦';
        return `
          <div class="profile-activity-item">
            <div class="profile-activity-item__icon">${statusIcon}</div>
            <div>
              <p class="profile-activity-item__title">${item.title || 'Sans titre'}</p>
              <p class="profile-activity-item__meta">${timeAgo(item.updatedAt || item.createdAt)} • ${formatNumber(item.views)} vues</p>
            </div>
            <div class="profile-activity-item__meta">${formatCurrency(item.price)}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderAnalytics() {
    const analytics = state.analytics;
    if (!analytics) {
      analyticsOverview.innerHTML = '<p class="profile-empty__text">Aucune donnée à afficher.</p>';
      analyticsCategory.innerHTML = '';
      analyticsStatus.innerHTML = '';
      analyticsPrices.innerHTML = '';
      analyticsTopAds.innerHTML = '';
      analyticsLocations.innerHTML = '';
      return;
    }

    const totalViews = Number(analytics.overview?.totalViews) || 0;
    const totalAds = Number(state.stats?.summary?.totalAds) || 0;

    analyticsOverview.innerHTML = `
      <div class="analytics-pill">
        <h4>Vues totales</h4>
        <strong>${formatNumber(analytics.overview?.totalViews ?? 0)}</strong>
      </div>
      <div class="analytics-pill">
        <h4>Favoris totaux</h4>
        <strong>${formatNumber(analytics.overview?.totalFavorites ?? 0)}</strong>
      </div>
      <div class="analytics-pill">
        <h4>Vues moy./annonce</h4>
        <strong>${formatNumber(analytics.overview?.averageViews ?? 0)}</strong>
      </div>
      <div class="analytics-pill">
        <h4>Favoris moy./annonce</h4>
        <strong>${formatNumber(analytics.overview?.averageFavorites ?? 0)}</strong>
      </div>
      <div class="analytics-pill">
        <h4>Valeur catalogue</h4>
        <strong>${formatCurrency(analytics.overview?.inventoryValue ?? 0)}</strong>
      </div>
    `;

    analyticsCategory.innerHTML = Array.isArray(analytics.categoryPerformance) &&
      analytics.categoryPerformance.length
        ? analytics.categoryPerformance
            .map(
        (entry) => `
        <div class="analytics-bar">
          <div class="analytics-bar__label">${entry.category}</div>
          <div class="analytics-bar__meter">
            <div class="analytics-bar__fill" style="transform: scaleX(${computeRatio(
              entry.views,
              totalViews
            )});"></div>
          </div>
          <div class="analytics-badge">${formatNumber(entry.views)} vues</div>
        </div>
      `
      )
            .join('')
        : '<p class="profile-empty__text">Aucune donnée par catégorie.</p>';

    analyticsStatus.innerHTML = Array.isArray(analytics.statusBreakdown) &&
      analytics.statusBreakdown.length
        ? analytics.statusBreakdown
            .map(
        (item) => `
        <div class="analytics-bar">
          <div class="analytics-bar__label" style="text-transform: capitalize;">${item.status}</div>
          <div class="analytics-bar__meter">
            <div class="analytics-bar__fill" style="transform: scaleX(${computeRatio(
              item.count,
              totalAds
            )});"></div>
          </div>
          <div class="analytics-badge">${formatNumber(item.count)}</div>
        </div>
      `
      )
            .join('')
        : '<p class="profile-empty__text">Aucune donnée de statut.</p>';

    analyticsPrices.innerHTML = Array.isArray(analytics.priceDistribution) &&
      analytics.priceDistribution.length
        ? analytics.priceDistribution
            .map(
        (item) => `
        <div class="analytics-bar">
          <div class="analytics-bar__label">${item.label}</div>
          <div class="analytics-bar__meter">
            <div class="analytics-bar__fill" style="transform: scaleX(${computeRatio(
              item.count,
              totalAds
            )});"></div>
          </div>
          <div class="analytics-badge">${formatNumber(item.count)}</div>
        </div>
      `
      )
            .join('')
        : '<p class="profile-empty__text">Aucune donnée de prix.</p>';

    analyticsTopAds.innerHTML = Array.isArray(analytics.topPerformingAds) &&
      analytics.topPerformingAds.length
        ? analytics.topPerformingAds
            .map(
        (ad) => `
        <div class="analytics-list-item">
          <div class="analytics-list-info">
            <div class="analytics-list-title">${ad.title || 'Sans titre'}</div>
            <div class="analytics-list-meta">${ad.category || 'Autres'} • ${formatCurrency(ad.price)}</div>
          </div>
          <div class="analytics-list-stats">
            <span>👁️ ${formatNumber(ad.views)}</span>
            <span>❤️ ${formatNumber(ad.favorites)}</span>
          </div>
        </div>
      `
      )
            .join('')
        : '<p class="profile-empty__text">Aucune annonce performante pour le moment.</p>';

    analyticsLocations.innerHTML = Array.isArray(analytics.locationDistribution) &&
      analytics.locationDistribution.length
        ? analytics.locationDistribution
          .map(
            (entry) => `
              <span>${entry.city} • ${formatNumber(entry.count)}</span>
            `
          )
          .join('')
        : '<p class="profile-empty__text">Aucune donnée géographique.</p>';
  }

  function renderAds() {
    const ads = Array.isArray(state.ads) ? state.ads : [];
    const totals = {
      all: ads.length,
      active: 0,
      draft: 0,
      archived: 0
    };

    ads.forEach((ad) => {
      totals[ad.status] = (totals[ad.status] || 0) + 1;
    });

    modal.querySelector('#filterAllCount').textContent = formatNumber(totals.all);
    modal.querySelector('#filterActiveCount').textContent = formatNumber(totals.active || 0);
    modal.querySelector('#filterDraftCount').textContent = formatNumber(totals.draft || 0);
    modal.querySelector('#filterArchivedCount').textContent = formatNumber(totals.archived || 0);

    const filtered = state.filter === 'all' ? ads : ads.filter((ad) => ad.status === state.filter);

    if (!filtered.length) {
      adsGrid.innerHTML = '';
      adsEmpty.hidden = false;
      return;
    }

    adsEmpty.hidden = true;
    adsGrid.innerHTML = filtered
      .map((ad) => {
        const thumb = (ad.previews && ad.previews[0]) || (ad.thumbnails && ad.thumbnails[0]) || (ad.images && ad.images[0]);
        const price = Number(ad.price) || 0;
        const views = Number(ad.views) || 0;
        const favorites = Number(ad.favoritesCount) || 0;
        const statusLabel = ad.status === 'active' ? 'Active' : ad.status === 'draft' ? 'Brouillon' : 'Archivée';
        return `
          <article class="profile-ad-card" data-ad-id="${ad._id}">
            <div class="profile-ad-card__media">
              ${thumb ? `<img src="${thumb}" alt="${ad.title || ''}" loading="lazy" decoding="async">` : '<div class="profile-ad-card__placeholder">📷</div>'}
              <span class="profile-ad-card__status status-${ad.status}">${statusLabel}</span>
            </div>
            <div class="profile-ad-card__body">
              <h4>${ad.title || 'Sans titre'}</h4>
              <p>${formatCurrency(price)} • ${formatNumber(views)} vues • ${formatNumber(favorites)} favoris</p>
            </div>
            <div class="profile-ad-card__actions">
              <button type="button" class="profile-ad-btn" data-action="view">Voir</button>
              <button type="button" class="profile-ad-btn" data-action="edit">Modifier</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function updateFilter(newFilter) {
    state.filter = newFilter;
    renderAds();
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
  }

  async function handleAvatarChange(file) {
    if (!file) return;
    setButtonLoading(avatarTrigger, true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      }).then((r) => r.json());

      if (response?.data?.sizes?.standard) {
        const auth = window.authStore?.get() || {};
        const updated = {
          ...auth,
          avatar: response.data.sizes.standard,
          avatarUrl: response.data.sizes.standard
        };
        window.authStore?.set(updated);
        window.updateAuthUI?.();
        setAvatarSource(avatarImg, response.data.sizes.standard);
        setAvatarSource(avatarMini, response.data.sizes.standard);
        window.updateAllAvatars?.(response.data.sizes.standard);
        if (typeof window.showToast === 'function') {
          window.showToast('Avatar mis à jour ✅');
        }
      } else {
        throw new Error(response?.message || "Impossible d'actualiser l'avatar");
      }
    } catch (error) {
      logger.error('Error uploading avatar', error);
      if (typeof window.showToast === 'function') {
        window.showToast("Impossible de mettre à jour l'avatar", 'danger');
      }
    } finally {
      setButtonLoading(avatarTrigger, false);
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    const api = getApi();
    setButtonLoading(infoSubmit, true);
    infoFeedback.textContent = 'Enregistrement en cours…';

    try {
      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim()
      };
      const response = await api.patch('/api/users/me', payload);
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        window.authStore?.set(updatedUser);
        window.updateAuthUI?.();
        renderSummary(updatedUser);
        infoFeedback.textContent = 'Profil mis à jour ✅';
        if (typeof window.showToast === 'function') {
          window.showToast('Profil mis à jour ✅');
        }
      } else {
        throw new Error(response?.message || 'Modification impossible');
      }
    } catch (error) {
      logger.error('Error updating profile', error);
      infoFeedback.textContent = 'Erreur lors de la mise à jour du profil.';
    } finally {
      setButtonLoading(infoSubmit, false);
      setTimeout(() => {
        infoFeedback.textContent = '';
      }, 2500);
    }
  }

  async function handleLocationUpdate(event) {
    event.preventDefault();
    const api = getApi();
    setButtonLoading(locationSubmit, true);
    locationFeedback.textContent = 'Enregistrement en cours…';

    try {
      const payload = {
        location: {
          city: cityInput.value.trim(),
          radiusKm: Number(radiusInput.value) || 10
        }
      };
      const response = await api.patch('/api/users/me', payload);
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        window.authStore?.set(updatedUser);
        renderSummary(updatedUser);
        locationFeedback.textContent = 'Localisation mise à jour ✅';
        if (typeof window.showToast === 'function') {
          window.showToast('Localisation mise à jour ✅');
        }
      } else {
        throw new Error(response?.message || 'Mise à jour impossible');
      }
    } catch (error) {
      logger.error('Error updating location', error);
      locationFeedback.textContent = 'Erreur lors de la mise à jour.';
    } finally {
      setButtonLoading(locationSubmit, false);
      setTimeout(() => {
        locationFeedback.textContent = '';
      }, 2500);
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    const api = getApi();
    const formData = new FormData(passwordForm);
    const currentPassword = String(formData.get('currentPassword') || '').trim();
    const newPassword = String(formData.get('newPassword') || '').trim();
    const confirmPassword = String(formData.get('confirmPassword') || '').trim();

    currentPasswordError.textContent = '';
    newPasswordError.textContent = '';
    confirmPasswordError.textContent = '';
    currentPasswordError.classList.remove('visible');
    newPasswordError.classList.remove('visible');
    confirmPasswordError.classList.remove('visible');

    if (!currentPassword) {
      currentPasswordError.textContent = 'Veuillez saisir votre mot de passe actuel.';
      currentPasswordError.classList.add('visible');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      newPasswordError.textContent = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      newPasswordError.classList.add('visible');
      return;
    }

    if (newPassword !== confirmPassword) {
      confirmPasswordError.textContent = 'Les mots de passe ne correspondent pas.';
      confirmPasswordError.classList.add('visible');
      return;
    }

    passwordFeedback.textContent = 'Mise à jour en cours…';
    setButtonLoading(passwordSubmit, true);

    try {
      const response = await api.post('/api/users/me/change-password', {
        currentPassword,
        newPassword
      });

      if (response?.status === 'success') {
        passwordFeedback.textContent = 'Mot de passe modifié ✅';
        passwordForm.reset();
        if (typeof window.showToast === 'function') {
          window.showToast('Mot de passe modifié ✅');
        }
        return;
      } else {
        const message = response?.message || 'Modification impossible';
        if (response?.code === 'INVALID_PASSWORD') {
          currentPasswordError.textContent = message;
          currentPasswordError.classList.add('visible');
        } else {
          passwordFeedback.textContent = message;
        }
        return;
      }
    } catch (error) {
      logger.error('Error changing password', error);
      passwordFeedback.textContent = "Erreur lors de la modification du mot de passe.";
    } finally {
      setButtonLoading(passwordSubmit, false);
      setTimeout(() => {
        passwordFeedback.textContent = '';
      }, 2500);
    }
  }

  function handleAdsAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.profile-ad-card');
    if (!card) return;
    const adId = card.dataset.adId;
    const ad = state.ads.find((item) => String(item._id) === String(adId));

    switch (button.dataset.action) {
      case 'edit':
        closeProfileModal();
        if (typeof window.openPostModal === 'function') {
          window.openPostModal({ adId: ad?._id, adData: ad });
        } else if (typeof window.showToast === 'function') {
          window.showToast('Impossible d’ouvrir le formulaire de modification', 'danger');
        }
        break;
      case 'view':
        if (typeof window.openDetailsById === 'function') {
          window.openDetailsById(ad?._id, ad);
          closeProfileModal();
        }
        break;
      default:
        break;
    }
  }

  function openProfileModal() {
    const user = window.authStore?.get();
    if (!user) {
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal();
      }
      return;
    }

    populateUser(user);
    loadDashboard();
    openModal();
  }

  function closeProfileModal() {
    closeModal();
  }

  function populateUser(user) {
    renderSummary(user);

    // Update header mini avatar and email
    const avatarValue = user?.avatarUrl || user?.avatar;
    setAvatarSource(avatarMini, avatarValue);
    if (emailHeader) {
      emailHeader.textContent = user?.email || '';
    }
  }

  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeProfileModal();
    }
  });

  closeBtn?.addEventListener('click', closeProfileModal);

  tabs.forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      if (!tabButton.classList.contains('active')) {
        switchTab(tabButton.dataset.tab);
      }
    });
  });

  modal.querySelectorAll('[data-open-tab]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      switchTab(trigger.dataset.openTab);
    });
  });

  adsFilters?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    adsFilters.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    updateFilter(button.dataset.filter);
  });

  adsGrid?.addEventListener('click', handleAdsAction);
  newAdBtn?.addEventListener('click', () => {
    closeProfileModal();
    if (typeof window.openPostModal === 'function') {
      window.openPostModal({});
    }
  });
  emptyCreateBtn?.addEventListener('click', () => {
    closeProfileModal();
    if (typeof window.openPostModal === 'function') {
      window.openPostModal({});
    }
  });
  summaryCreateBtn?.addEventListener('click', () => {
    closeProfileModal();
    if (typeof window.openPostModal === 'function') {
      window.openPostModal({});
    }
  });

  avatarTrigger?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAvatarChange(file);
    }
  });

  infoForm?.addEventListener('submit', handleProfileUpdate);
  locationForm?.addEventListener('submit', handleLocationUpdate);
  passwordForm?.addEventListener('submit', handlePasswordUpdate);

  document.addEventListener('auth:change', (event) => {
    populateUser(event.detail || window.authStore?.get());
  });

  window.openProfileModal = openProfileModal;
  window.closeProfileModal = closeProfileModal;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfileModal, { once: true });
} else {
  initProfileModal();
}
