// ========================================
// PROFILE DRAWER - Module ES
// ========================================

const noopLogger = () => {};
const logger = window.__APP_LOGGER__ || {
  info: noopLogger,
  warn: noopLogger,
  error: (...args) => {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[ProfileModal]', ...args);
    }
  }
};

// === State ===
const drawerState = {
  isOpen: false,
  activeTab: 'overview',
  data: null,
  previousFocus: null
};

const deleteConfirmState = {
  isOpen: false,
  isLoading: false
};

// === DOM Elements ===
const drawer = document.getElementById('profileDrawer');
const overlay = drawer?.querySelector('.profile-overlay');
const closeBtn = drawer?.querySelector('.profile-close');
const tabs = drawer?.querySelectorAll('[role="tab"]');
const panels = {
  overview: document.getElementById('profilePanelOverview'),
  analytics: document.getElementById('profilePanelAnalytics')
};

// Avatar
const avatarBtn = document.getElementById('profileAvatarBtn');
const avatarImg = document.getElementById('profileAvatarImg');
const avatarInput = document.getElementById('profileAvatarInput');

// Header identity
const nameEl = document.getElementById('profileTitle');
const emailEl = document.getElementById('profileEmail');
const memberSinceEl = document.getElementById('profileMemberSince');

// Overview panel
const locationChip = document.getElementById('profileLocationChip');
const adsCountChip = document.getElementById('profileAdsCountChip');

// Analytics panel
const kpisEls = {
  totalViews: document.getElementById('kpiTotalViews'),
  totalFavorites: document.getElementById('kpiTotalFavorites'),
  averageViews: document.getElementById('kpiAverageViews'),
  inventoryValue: document.getElementById('kpiInventoryValue')
};
const categoryChart = document.getElementById('analyticsCategoryChart');
const topAds = document.getElementById('analyticsTopAds');
const geoList = document.getElementById('analyticsGeoList');

// Editable forms (Overview tab)
const infoForm = document.getElementById('profileInfoForm');
const infoFeedback = document.getElementById('profileInfoFeedback');
const infoSubmit = document.getElementById('profileInfoSubmit');
const nameInput = document.getElementById('profileNameInput');
const emailInput = document.getElementById('profileEmailInput');

const locationForm = document.getElementById('profileLocationForm');
const locationFeedback = document.getElementById('profileLocationFeedback');
const locationSubmit = document.getElementById('profileLocationSubmit');
const cityInput = document.getElementById('profileCityInput');
const radiusInput = document.getElementById('profileRadiusInput');

const passwordForm = document.getElementById('profilePasswordForm');
const passwordFeedback = document.getElementById('profilePasswordFeedback');
const passwordSubmit = document.getElementById('profilePasswordSubmit');
const currentPasswordError = document.getElementById('currentPasswordError');
const newPasswordError = document.getElementById('newPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

const deleteBtn = document.getElementById('profileDeleteBtn');
const deleteConfirmModal = document.getElementById('profileDeleteConfirm');
const deleteConfirmInput = document.getElementById('profileDeleteConfirmInput');
const deleteConfirmBtn = document.getElementById('profileDeleteConfirmBtn');
const deleteCancelBtn = document.getElementById('profileDeleteCancelBtn');
const deleteConfirmFeedback = document.getElementById('profileDeleteConfirmFeedback');
const deleteConfirmDialog = deleteConfirmModal?.querySelector('.mm-confirm__dialog') || null;
const deleteConfirmBtnDefaultText = deleteConfirmBtn?.textContent || 'Supprimer définitivement';

// === Formatters ===
const numberFormatter = new Intl.NumberFormat('fr-FR');
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'long'
});

const DEFAULT_AVATAR = '/uploads/avatars/default.jpg';

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEYS = {
  STATS: 'profile_stats_cache',
  ANALYTICS: 'profile_analytics_cache'
};

// === Helpers ===
function resolveAvatarSrc(rawValue) {
  if (typeof window.getAvatarUrl === 'function') {
    return window.getAvatarUrl(rawValue);
  }
  if (!rawValue) return DEFAULT_AVATAR;
  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) return rawValue;
  if (rawValue.startsWith('/')) return rawValue;
  return `/uploads/avatars/${rawValue}`;
}

// === Cache Helpers ===
function saveCacheData(key, data) {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
    logger.info(`✓ Cache saved: ${key}`);
  } catch (err) {
    logger.error(`❌ Error saving cache ${key}:`, err);
  }
}

function getCacheData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheItem = JSON.parse(cached);
    const age = Date.now() - cacheItem.timestamp;

    // Check if cache is still valid (within TTL)
    if (age < CACHE_TTL) {
      logger.info(`✓ Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
      return cacheItem.data;
    }

    // Cache expired, remove it
    logger.info(`⏱ Cache expired: ${key}`);
    localStorage.removeItem(key);
    return null;
  } catch (err) {
    logger.error(`❌ Error reading cache ${key}:`, err);
    return null;
  }
}

function clearProfileCache() {
  try {
    localStorage.removeItem(CACHE_KEYS.STATS);
    localStorage.removeItem(CACHE_KEYS.ANALYTICS);
    logger.info('✓ Profile cache cleared');
  } catch (err) {
    logger.error('❌ Error clearing cache:', err);
  }
}

function showFeedback(el, message, type) {
  if (!el) return;

  // Clear previous feedback
  el.textContent = '';
  el.className = 'profile-form-feedback';

  // Force reflow to restart animation
  void el.offsetWidth;

  // Set new feedback with aria-live support
  el.textContent = message;
  el.className = `profile-form-feedback ${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    el.className = 'profile-form-feedback';
    el.textContent = '';
  }, 5000);
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function clearErrors() {
  [currentPasswordError, newPasswordError, confirmPasswordError].forEach((el) => {
    if (el) {
      el.textContent = '';
      el.classList.remove('visible');
    }
  });
}

function isDeleteConfirmOpen() {
  return Boolean(deleteConfirmModal && !deleteConfirmModal.hidden && deleteConfirmState.isOpen);
}

function resetDeleteConfirmFeedback() {
  if (deleteConfirmFeedback) {
    deleteConfirmFeedback.className = 'profile-form-feedback mm-confirm__feedback';
    deleteConfirmFeedback.textContent = '';
  }
}

function showDeleteConfirmFeedback(message, type) {
  if (!deleteConfirmFeedback) return;
  showFeedback(deleteConfirmFeedback, message, type);
  deleteConfirmFeedback.classList.add('mm-confirm__feedback');
}

function deleteKeywordMatch(value) {
  return value.trim().toUpperCase() === 'SUPPRIMER';
}

function openDeleteConfirm() {
  if (!deleteConfirmModal) return;
  if (isDeleteConfirmOpen()) return;

  deleteConfirmModal.hidden = false;
  deleteConfirmModal.removeAttribute('hidden');
  deleteConfirmModal.classList.add('is-open');
  deleteConfirmState.isOpen = true;
  deleteConfirmState.isLoading = false;

  if (deleteConfirmInput) {
    deleteConfirmInput.value = '';
    deleteConfirmInput.disabled = false;
    deleteConfirmInput.removeAttribute('aria-invalid');
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = deleteConfirmBtnDefaultText;
  }

  deleteCancelBtn && (deleteCancelBtn.disabled = false);
  resetDeleteConfirmFeedback();

  requestAnimationFrame(() => {
    setTimeout(() => deleteConfirmInput?.focus(), 40);
  });
}

function closeDeleteConfirm(force = false) {
  if (!deleteConfirmModal) return;
  if (!isDeleteConfirmOpen()) return;
  if (deleteConfirmState.isLoading && !force) return;

  deleteConfirmModal.classList.remove('is-open');
  deleteConfirmState.isOpen = false;

  const finalize = () => {
    deleteConfirmModal.hidden = true;
    deleteConfirmState.isLoading = false;

    if (deleteConfirmInput) {
      deleteConfirmInput.value = '';
      deleteConfirmInput.disabled = false;
      deleteConfirmInput.removeAttribute('aria-invalid');
    }

    if (deleteConfirmBtn) {
      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.textContent = deleteConfirmBtnDefaultText;
    }

    if (deleteCancelBtn) {
      deleteCancelBtn.disabled = false;
    }

    resetDeleteConfirmFeedback();
  };

  if (force) {
    finalize();
  } else {
    setTimeout(finalize, 200);
  }
}

function setDeleteConfirmLoading(isLoading) {
  deleteConfirmState.isLoading = isLoading;

  if (deleteConfirmBtn) {
    deleteConfirmBtn.disabled =
      isLoading || !deleteConfirmInput || !deleteKeywordMatch(deleteConfirmInput.value);
    deleteConfirmBtn.textContent = isLoading
      ? 'Suppression en cours…'
      : deleteConfirmBtnDefaultText;
  }

  if (deleteConfirmInput) {
    deleteConfirmInput.disabled = isLoading;
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.disabled = isLoading;
  }
}

function handleDeleteConfirmInput(e) {
  const value = e.target.value;
  const match = deleteKeywordMatch(value);

  if (!value.trim()) {
    e.target.removeAttribute('aria-invalid');
  } else {
    e.target.setAttribute('aria-invalid', match ? 'false' : 'true');
  }

  if (deleteConfirmBtn && !deleteConfirmState.isLoading) {
    deleteConfirmBtn.disabled = !match;
  }
}

async function confirmDeleteAccount() {
  if (!deleteConfirmModal) return;

  setDeleteConfirmLoading(true);
  showDeleteConfirmFeedback('⏳ Suppression en cours…', 'info');

  try {
    const response = await fetch('/api/users/me', {
      method: 'DELETE'
    });

    let result = {};
    try {
      result = await response.json();
    } catch (err) {
      logger.warn('Delete response not JSON:', err);
    }

    if (!response.ok) {
      throw new Error(result.message || 'Erreur lors de la suppression');
    }

    showDeleteConfirmFeedback('✓ Compte supprimé. Déconnexion…', 'success');

    setTimeout(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }, 1200);
  } catch (err) {
    logger.error('Error deleting account:', err);
    showDeleteConfirmFeedback(`❌ ${err.message || 'Erreur réseau'}`, 'error');
    setDeleteConfirmLoading(false);
  }
}

function showEmptyAnalytics() {
  const analyticsPanel = panels.analytics;
  if (!analyticsPanel) return;

  const emptyHTML = `
    <div class="profile-empty-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <h3>Aucune donnée analytique</h3>
      <p>Créez votre première annonce pour commencer à suivre vos statistiques et performances.</p>
    </div>
  `;

  // Replace KPI section
  const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
  if (kpisContainer) {
    kpisContainer.innerHTML = emptyHTML;
  }
}

function restoreAnalyticsKpis() {
  const analyticsPanel = panels.analytics;
  if (!analyticsPanel) return;

  const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
  if (kpisContainer) {
    kpisContainer.innerHTML = `
      <div class="profile-kpi">
        <span class="profile-kpi-label">Vues totales</span>
        <span class="profile-kpi-value" id="kpiTotalViews">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Favoris totaux</span>
        <span class="profile-kpi-value" id="kpiTotalFavorites">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Vues moy./annonce</span>
        <span class="profile-kpi-value" id="kpiAverageViews">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Valeur catalogue</span>
        <span class="profile-kpi-value" id="kpiInventoryValue">0 €</span>
      </div>
    `;

    // Re-cache DOM elements after restoration
    kpisEls.totalViews = document.getElementById('kpiTotalViews');
    kpisEls.totalFavorites = document.getElementById('kpiTotalFavorites');
    kpisEls.averageViews = document.getElementById('kpiAverageViews');
    kpisEls.inventoryValue = document.getElementById('kpiInventoryValue');
  }
}

function showLoadingSkeletons() {
  // Show skeletons in analytics panel only
  const analyticsPanel = panels.analytics;
  if (analyticsPanel) {
    const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
    if (kpisContainer) {
      kpisContainer.innerHTML = `
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
      `;
    }
  }
}

// === Focus Management ===
const focusableSelectors =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isFocusableElement(el) {
  if (!el) return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  if (el.tabIndex === -1) return false;
  if (el.closest('[hidden]')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFocusScope() {
  if (isDeleteConfirmOpen() && deleteConfirmDialog) {
    return deleteConfirmDialog;
  }
  return drawer;
}

function trapFocus(e) {
  if (!drawerState.isOpen || e.key !== 'Tab') return;

  const scope = getFocusScope();
  if (!scope) return;

  const focusables = Array.from(scope.querySelectorAll(focusableSelectors)).filter(
    isFocusableElement
  );
  if (!focusables.length) return;

  const firstFocusable = focusables[0];
  const lastFocusable = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === firstFocusable) {
    e.preventDefault();
    lastFocusable?.focus();
  } else if (!e.shiftKey && document.activeElement === lastFocusable) {
    e.preventDefault();
    firstFocusable?.focus();
  }
}

function handleEscape(e) {
  if (e.key !== 'Escape') return;

  if (isDeleteConfirmOpen()) {
    closeDeleteConfirm();
    return;
  }

  if (drawerState.isOpen) {
    closeProfileDrawer();
  }
}

// === Tab Management ===
function setActiveTab(tabName) {
  drawerState.activeTab = tabName;
  localStorage.setItem('profileActiveTab', tabName);

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.setAttribute('aria-selected', isActive);
  });

  Object.entries(panels).forEach(([key, panel]) => {
    if (panel) {
      panel.hidden = key !== tabName;
    }
  });
}

function onTabClick(e) {
  const tab = e.currentTarget;
  const tabName = tab.dataset.tab;
  if (tabName) {
    setActiveTab(tabName);
  }
}

function onTabKeydown(e) {
  const currentTab = e.currentTarget;
  const tabsArray = Array.from(tabs);
  const currentIndex = tabsArray.indexOf(currentTab);

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % tabsArray.length;
    tabsArray[nextIndex].focus();
    setActiveTab(tabsArray[nextIndex].dataset.tab);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + tabsArray.length) % tabsArray.length;
    tabsArray[prevIndex].focus();
    setActiveTab(tabsArray[prevIndex].dataset.tab);
  }
}

// === Render Functions ===
function renderHeader(user) {
  if (!user) return;

  if (avatarImg) avatarImg.src = resolveAvatarSrc(user.avatarUrl);
  if (nameEl) nameEl.textContent = user.name || 'Utilisateur';
  if (emailEl) emailEl.textContent = user.email || '';
  if (memberSinceEl && user.memberSince) {
    const date = new Date(user.memberSince);
    memberSinceEl.textContent = `Membre depuis ${dateFormatter.format(date)}`;
  }
}

function renderOverview(data) {
  const { user, stats } = data;

  // DEBUG: Log pour vérifier les données reçues
  logger.info('renderOverview - stats:', stats);
  logger.info('renderOverview - stats.summary:', stats?.summary);
  logger.info('renderOverview - activeAds:', stats?.summary?.activeAds);

  // Location chip
  if (locationChip) {
    locationChip.textContent = user.location?.city ? `📍 ${user.location.city}` : '📍 —';
  }

  // Ads count chip
  if (adsCountChip && stats?.summary) {
    const activeAds = stats.summary.activeAds || 0;
    adsCountChip.textContent = `📋 ${activeAds} annonce${activeAds > 1 ? 's' : ''}`;
  }
}

function renderAnalytics(analytics) {
  if (!analytics) {
    showEmptyAnalytics();
    return;
  }

  // Check if analytics has any meaningful data
  const overview = analytics.overview || {};
  const hasData =
    overview.totalViews > 0 ||
    overview.totalFavorites > 0 ||
    (analytics.categoryPerformance && analytics.categoryPerformance.length > 0);

  if (!hasData) {
    showEmptyAnalytics();
    return;
  }

  // Restore KPIs structure (in case skeletons were shown)
  restoreAnalyticsKpis();

  // KPIs
  if (kpisEls.totalViews) {
    kpisEls.totalViews.textContent = numberFormatter.format(overview.totalViews || 0);
  }
  if (kpisEls.totalFavorites) {
    kpisEls.totalFavorites.textContent = numberFormatter.format(overview.totalFavorites || 0);
  }
  if (kpisEls.averageViews) {
    kpisEls.averageViews.textContent = numberFormatter.format(overview.averageViews || 0);
  }
  if (kpisEls.inventoryValue) {
    kpisEls.inventoryValue.textContent = currencyFormatter.format(overview.inventoryValue || 0);
  }

  // Category performance
  if (categoryChart && analytics.categoryPerformance) {
    if (analytics.categoryPerformance.length === 0) {
      categoryChart.innerHTML =
        '<div class="profile-empty-state"><p>Aucune donnée de catégorie disponible</p></div>';
    } else {
      const maxValue = Math.max(
        ...analytics.categoryPerformance.map((c) => c.views || c.value || 0),
        1
      );
      categoryChart.innerHTML = analytics.categoryPerformance
        .map((item) => {
          const value = item.views || item.value || 0;
          const percent = (value / maxValue) * 100;
          return `
        <div class="profile-chart-bar">
          <div class="profile-chart-label">${item.category}</div>
          <div class="profile-chart-track">
            <div class="profile-chart-fill" style="width: ${percent}%">
              <span class="profile-chart-value">${numberFormatter.format(value)}</span>
            </div>
          </div>
        </div>
      `;
        })
        .join('');
    }
  }

  // Top ads
  if (topAds && analytics.topPerformingAds) {
    if (analytics.topPerformingAds.length === 0) {
      topAds.innerHTML = '<li>Aucune donnée</li>';
    } else {
      topAds.innerHTML = analytics.topPerformingAds
        .map(
          (ad) => `
        <li>
          <span class="profile-top-ad-title">${ad.title}</span>
          <div class="profile-top-ad-stats">
            <span>👁️ ${numberFormatter.format(ad.views)}</span>
            <span>❤️ ${numberFormatter.format(ad.favorites)}</span>
          </div>
        </li>
      `
        )
        .join('');
    }
  }

  // Geo distribution
  if (geoList && analytics.locationDistribution) {
    if (analytics.locationDistribution.length === 0) {
      geoList.innerHTML = '<li>Aucune donnée</li>';
    } else {
      geoList.innerHTML = analytics.locationDistribution
        .map((loc) => `<li>${loc.city}</li>`)
        .join('');
    }
  }
}

function renderSettings(user) {
  if (!user) return;
  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (cityInput) cityInput.value = user.location?.city || '';
  if (radiusInput) radiusInput.value = user.location?.radiusKm || '';
}

// === Form Handlers ===
async function onSaveInfo(e) {
  e.preventDefault();
  if (!infoSubmit) return;

  infoSubmit.disabled = true;
  infoSubmit.textContent = 'Enregistrement...';

  try {
    const formData = new FormData(infoForm);
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email')
      })
    });

    const result = await response.json();

    if (response.ok) {
      showFeedback(infoFeedback, 'Informations mises à jour', 'success');
      // Clear cache to force refresh on next load
      clearProfileCache();
      // Update local state
      if (drawerState.data?.user) {
        drawerState.data.user.name = result.user?.name || formData.get('name');
        drawerState.data.user.email = result.user?.email || formData.get('email');
        renderHeader(drawerState.data.user);
      }
    } else {
      showFeedback(infoFeedback, result.message || 'Erreur lors de la mise à jour', 'error');
    }
  } catch (err) {
    logger.error('Error saving info:', err);
    showFeedback(infoFeedback, 'Erreur réseau', 'error');
  } finally {
    infoSubmit.disabled = false;
    infoSubmit.textContent = 'Enregistrer';
  }
}

async function onSaveLocation(e) {
  e.preventDefault();
  if (!locationSubmit) return;

  locationSubmit.disabled = true;
  locationSubmit.textContent = 'Enregistrement...';

  try {
    const formData = new FormData(locationForm);
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'location.city': formData.get('city'),
        'location.radiusKm': parseInt(formData.get('radiusKm'), 10) || 0
      })
    });

    const result = await response.json();

    if (response.ok) {
      showFeedback(locationFeedback, 'Localisation mise à jour', 'success');
      // Clear cache to force refresh on next load
      clearProfileCache();
      // Update local state
      if (drawerState.data?.user) {
        drawerState.data.user.location = drawerState.data.user.location || {};
        drawerState.data.user.location.city = formData.get('city');
        drawerState.data.user.location.radiusKm = parseInt(formData.get('radiusKm'), 10);
        renderOverview(drawerState.data);
      }
    } else {
      showFeedback(locationFeedback, result.message || 'Erreur lors de la mise à jour', 'error');
    }
  } catch (err) {
    logger.error('Error saving location:', err);
    showFeedback(locationFeedback, 'Erreur réseau', 'error');
  } finally {
    locationSubmit.disabled = false;
    locationSubmit.textContent = 'Enregistrer';
  }
}

async function onChangePassword(e) {
  e.preventDefault();
  clearErrors();
  if (!passwordSubmit) return;

  const currentPassword = document.getElementById('profileCurrentPassword')?.value;
  const newPassword = document.getElementById('profileNewPassword')?.value;
  const confirmPassword = document.getElementById('profileConfirmPassword')?.value;

  // Client-side validation
  if (!currentPassword) {
    showError(currentPasswordError, 'Champ requis');
    return;
  }
  if (!newPassword || newPassword.length < 8) {
    showError(newPasswordError, 'Minimum 8 caractères');
    return;
  }
  if (newPassword !== confirmPassword) {
    showError(confirmPasswordError, 'Les mots de passe ne correspondent pas');
    return;
  }

  passwordSubmit.disabled = true;
  passwordSubmit.textContent = 'Changement...';

  try {
    const response = await fetch('/api/users/me/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const result = await response.json();

    if (response.ok) {
      showFeedback(passwordFeedback, 'Mot de passe changé avec succès', 'success');
      passwordForm.reset();
    } else {
      if (result.message?.includes('actuel')) {
        showError(currentPasswordError, result.message);
      } else {
        showFeedback(passwordFeedback, result.message || 'Erreur lors du changement', 'error');
      }
    }
  } catch (err) {
    logger.error('Error changing password:', err);
    showFeedback(passwordFeedback, 'Erreur réseau', 'error');
  } finally {
    passwordSubmit.disabled = false;
    passwordSubmit.textContent = 'Changer le mot de passe';
  }
}

async function onUploadAvatar(file) {
  if (!file || !file.type.startsWith('image/')) {
    showFeedback(
      infoFeedback,
      '⚠️ Format de fichier invalide. Utilisez JPG, PNG ou WEBP.',
      'error'
    );
    logger.warn('Invalid file type');
    return;
  }

  // Validate file size (2MB max)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    showFeedback(infoFeedback, '⚠️ Fichier trop volumineux. Maximum 2 MB.', 'error');
    return;
  }

  try {
    // 1. Optimistic UI - Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    if (avatarImg) {
      avatarImg.src = previewUrl;
    }

    // Disable upload button during upload
    if (avatarBtn) {
      avatarBtn.disabled = true;
      avatarBtn.style.opacity = '0.6';
      avatarBtn.style.cursor = 'wait';
    }

    // Show uploading feedback
    if (infoFeedback) {
      showFeedback(infoFeedback, '⏳ Upload en cours...', 'info');
    }

    // 2. Upload to server
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/users/me/avatar', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new Error(result.message || "Échec de l'upload");
    }

    // Extract avatarUrl from new flat response structure
    const avatarUrl = result.data?.avatarUrl || result.avatarUrl;

    if (!avatarUrl) {
      throw new Error("URL d'avatar manquante dans la réponse");
    }

    // 3. Cache-busting - Update all avatar images with timestamp
    const cacheBustedUrl = `${avatarUrl}?t=${Date.now()}`;

    if (avatarImg) {
      // Clean up blob URL
      URL.revokeObjectURL(previewUrl);
      avatarImg.src = cacheBustedUrl;
    }

    // Update state
    if (drawerState.data?.user) {
      drawerState.data.user.avatarUrl = avatarUrl;
    }

    // 4. Update authStore if available
    if (window.authStore?.get) {
      const currentUser = window.authStore.get();
      if (currentUser) {
        window.authStore.set({ ...currentUser, avatarUrl, avatar: avatarUrl });
      }
    }

    // 5. Propagate to global header via CustomEvent
    const event = new CustomEvent('user:avatar-updated', {
      detail: { avatarUrl: cacheBustedUrl }
    });
    document.dispatchEvent(event);

    // 6. Clear cache to force refresh on next load
    clearProfileCache();

    // 7. Success feedback with aria-live
    showFeedback(infoFeedback, '✓ Avatar mis à jour avec succès', 'success');
    logger.info('Avatar uploaded successfully:', avatarUrl);
  } catch (err) {
    logger.error('Error uploading avatar:', err);

    // Revert optimistic update on error
    if (avatarImg && drawerState.data?.user?.avatarUrl) {
      avatarImg.src = resolveAvatarSrc(drawerState.data.user.avatarUrl);
    }

    // Error feedback
    const errorMsg = err.message || "Échec de l'upload de l'avatar";
    showFeedback(infoFeedback, `❌ ${errorMsg}`, 'error');
  } finally {
    // Re-enable upload button
    if (avatarBtn) {
      avatarBtn.disabled = false;
      avatarBtn.style.opacity = '1';
      avatarBtn.style.cursor = 'pointer';
    }
  }
}

function onDeleteAccount() {
  openDeleteConfirm();
}

// === Fetch Profile Data ===
async function fetchProfileData() {
  try {
    // Try to get user from authStore first (local data)
    const authUser = window.authStore?.get();

    if (authUser) {
      logger.info('Using authStore user data');

      // Build user object from authStore
      const user = {
        id: authUser._id || authUser.id || '',
        name: authUser.name || authUser.username || 'Utilisateur',
        email: authUser.email || '',
        role: authUser.role || 'user',
        isActive: authUser.isActive !== false,
        memberSince: authUser.createdAt || authUser.memberSince || new Date().toISOString(),
        avatarUrl: authUser.avatar || authUser.avatarUrl || '',
        location: {
          city: authUser.location?.city || authUser.city || '',
          radiusKm: authUser.location?.radiusKm || authUser.radiusKm || 0
        }
      };

      // Try to get from cache first
      let stats = getCacheData(CACHE_KEYS.STATS);
      let analytics = getCacheData(CACHE_KEYS.ANALYTICS);

      // If not in cache, fetch from API
      if (!stats || !analytics) {
        const [statsRes, analyticsRes] = await Promise.allSettled([
          !stats
            ? fetch('/api/users/me/stats')
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            : Promise.resolve({ data: stats }),
          !analytics
            ? fetch('/api/users/me/analytics')
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            : Promise.resolve({ data: analytics })
        ]);

        // API now returns flat structure in data field (no nested envelope)
        if (!stats) {
          stats =
            statsRes.status === 'fulfilled' && statsRes.value?.data
              ? statsRes.value.data
              : {
                  summary: {
                    activeAds: 0,
                    draftAds: 0,
                    archivedAds: 0,
                    totalViews: 0,
                    totalFavorites: 0,
                    inventoryValue: 0,
                    averagePrice: 0,
                    totalAds: 0,
                    averageViews: 0
                  },
                  recentActivity: []
                };
          // Save to cache
          if (stats.summary.totalAds > 0 || stats.summary.totalViews > 0) {
            saveCacheData(CACHE_KEYS.STATS, stats);
          }
        }

        if (!analytics) {
          analytics =
            analyticsRes.status === 'fulfilled' && analyticsRes.value?.data
              ? analyticsRes.value.data
              : {
                  overview: {
                    totalViews: 0,
                    totalFavorites: 0,
                    averageViews: 0,
                    inventoryValue: 0
                  },
                  categoryPerformance: [],
                  statusBreakdown: [],
                  priceDistribution: [],
                  topPerformingAds: [],
                  locationDistribution: []
                };
          // Save to cache
          if (analytics.overview.totalViews > 0 || analytics.categoryPerformance?.length > 0) {
            saveCacheData(CACHE_KEYS.ANALYTICS, analytics);
          }
        }
      }

      return { user, stats, analytics };
    }

    // Fallback: try API if no authStore
    logger.warn('No authStore data, trying API');

    // Try to get from cache first
    let stats = getCacheData(CACHE_KEYS.STATS);
    let analytics = getCacheData(CACHE_KEYS.ANALYTICS);

    const [userRes, statsRes, analyticsRes] = await Promise.allSettled([
      fetch('/api/users/me')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      !stats
        ? fetch('/api/users/me/stats')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve({ data: stats }),
      !analytics
        ? fetch('/api/users/me/analytics')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve({ data: analytics })
    ]);

    const apiUser = userRes.status === 'fulfilled' && userRes.value ? userRes.value : null;

    if (!stats) {
      stats =
        statsRes.status === 'fulfilled' && statsRes.value?.data
          ? statsRes.value.data
          : {
              summary: {
                activeAds: 0,
                draftAds: 0,
                archivedAds: 0,
                totalViews: 0,
                totalFavorites: 0,
                inventoryValue: 0,
                averagePrice: 0,
                totalAds: 0,
                averageViews: 0
              },
              recentActivity: []
            };
      // Save to cache
      if (stats.summary.totalAds > 0 || stats.summary.totalViews > 0) {
        saveCacheData(CACHE_KEYS.STATS, stats);
      }
    }

    if (!analytics) {
      analytics =
        analyticsRes.status === 'fulfilled' && analyticsRes.value?.data
          ? analyticsRes.value.data
          : {
              overview: { totalViews: 0, totalFavorites: 0, averageViews: 0, inventoryValue: 0 },
              categoryPerformance: [],
              statusBreakdown: [],
              priceDistribution: [],
              topPerformingAds: [],
              locationDistribution: []
            };
      // Save to cache
      if (analytics.overview.totalViews > 0 || analytics.categoryPerformance?.length > 0) {
        saveCacheData(CACHE_KEYS.ANALYTICS, analytics);
      }
    }

    return {
      user: apiUser?.user || {
        id: '',
        name: 'Utilisateur',
        email: '',
        role: 'user',
        isActive: true,
        memberSince: new Date().toISOString(),
        avatarUrl: '',
        location: { city: '', radiusKm: 0 }
      },
      stats,
      analytics
    };
  } catch (err) {
    logger.error('Error fetching profile data:', err);
    return null;
  }
}

// === Open/Close ===
async function openProfileDrawer(data) {
  logger.info('🚀 openProfileDrawer called');

  if (!drawer) {
    logger.error('❌ Profile drawer not found in DOM');
    return;
  }

  logger.info('✓ Drawer found, fetching data...');

  drawerState.previousFocus = document.activeElement;
  drawerState.isOpen = true;

  // If no data provided, show skeletons and fetch it
  let profileData = data;
  if (!profileData) {
    // Show loading skeletons
    showLoadingSkeletons();

    profileData = await fetchProfileData();
    if (!profileData) {
      logger.error('❌ Could not fetch profile data');
      // Show error state
      showEmptyAnalytics();
      return;
    }
    logger.info('✓ Data fetched:', profileData);
  }

  logger.info('✓ Opening drawer with data:', profileData.user?.name);

  drawerState.data = profileData;

  // Render
  renderHeader(profileData.user);
  renderOverview(profileData);
  renderAnalytics(profileData.analytics);
  renderSettings(profileData.user);

  // Restore last active tab
  const savedTab = localStorage.getItem('profileActiveTab') || 'overview';
  setActiveTab(savedTab);

  // Show drawer
  logger.info('✓ Showing drawer...');
  drawer.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    logger.info('✓ Drawer is now visible with class is-open');
  });

  // Focus management - focus the close button or first tab
  setTimeout(() => {
    const closeButton = drawer.querySelector('.profile-close');
    const firstTab = drawer.querySelector('[role="tab"]');
    const focusTarget = closeButton || firstTab;

    if (focusTarget) {
      focusTarget.focus();
      logger.info('✓ Focus set to:', focusTarget.getAttribute('aria-label') || 'first element');
    }
  }, 100);

  // Add listeners
  document.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', handleEscape);

  logger.info('🎉 Profile drawer opened successfully!');
}

function closeProfileDrawer() {
  if (!drawer || !drawerState.isOpen) return;

  closeDeleteConfirm(true);
  drawer.classList.remove('is-open');

  setTimeout(() => {
    drawer.hidden = true;
    drawerState.isOpen = false;

    // Restore focus
    if (drawerState.previousFocus) {
      drawerState.previousFocus.focus();
      drawerState.previousFocus = null;
    }

    // Remove listeners
    document.removeEventListener('keydown', trapFocus);
    document.removeEventListener('keydown', handleEscape);
  }, 250);
}

// === Event Listeners ===
function init() {
  if (!drawer) {
    logger.warn('Profile drawer not found, skipping init');
    return;
  }

  // Close handlers
  closeBtn?.addEventListener('click', closeProfileDrawer);
  overlay?.addEventListener('click', closeProfileDrawer);
  drawer.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', closeProfileDrawer);
  });

  // Tabs
  tabs.forEach((tab) => {
    tab.addEventListener('click', onTabClick);
    tab.addEventListener('keydown', onTabKeydown);
  });

  // Avatar upload
  avatarBtn?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadAvatar(file);
  });

  // Drag & drop avatar
  avatarBtn?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  avatarBtn?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) onUploadAvatar(file);
  });

  // Forms
  infoForm?.addEventListener('submit', onSaveInfo);
  locationForm?.addEventListener('submit', onSaveLocation);
  passwordForm?.addEventListener('submit', onChangePassword);
  deleteBtn?.addEventListener('click', onDeleteAccount);

  deleteConfirmInput?.addEventListener('input', handleDeleteConfirmInput);
  deleteConfirmInput?.addEventListener('keydown', (e) => {
    if (
      e.key === 'Enter' &&
      deleteConfirmBtn &&
      !deleteConfirmBtn.disabled &&
      !deleteConfirmState.isLoading
    ) {
      e.preventDefault();
      confirmDeleteAccount();
    }
  });

  deleteConfirmBtn?.addEventListener('click', confirmDeleteAccount);
  if (deleteConfirmModal) {
    deleteConfirmModal.querySelectorAll('[data-confirm-close]').forEach((el) => {
      el.addEventListener('click', () => closeDeleteConfirm());
    });
  }

  logger.info('Profile drawer initialized');
}

// Expose globally IMMEDIATELY (before init)
window.openProfileDrawer = openProfileDrawer;
window.closeProfileDrawer = closeProfileDrawer;

// Alias pour compatibilité avec l'ancien code
window.openProfileModal = openProfileDrawer;
window.closeProfileModal = closeProfileDrawer;

logger.info('Profile drawer functions exposed globally');

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
