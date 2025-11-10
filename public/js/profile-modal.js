// ========================================
// PROFILE DRAWER - Module ES
// ========================================

const logger = window.__APP_LOGGER__ || console;

// === State ===
const drawerState = {
  isOpen: false,
  activeTab: 'overview',
  data: null,
  previousFocus: null
};

// === DOM Elements ===
const drawer = document.getElementById('profileDrawer');
const overlay = drawer?.querySelector('.profile-overlay');
const closeBtn = drawer?.querySelector('.profile-close');
const tabs = drawer?.querySelectorAll('[role="tab"]');
const panels = {
  overview: document.getElementById('profilePanelOverview'),
  analytics: document.getElementById('profilePanelAnalytics'),
  settings: document.getElementById('profilePanelSettings')
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
const roleChip = document.getElementById('profileRoleChip');
const locationChip = document.getElementById('profileLocationChip');
const radiusChip = document.getElementById('profileRadiusChip');
const statusChip = document.getElementById('profileStatusChip');
const createAdBtn = document.getElementById('profileCreateAdBtn');
const metricsEls = {
  activeAds: document.getElementById('metricActiveAds'),
  draftAds: document.getElementById('metricDraftAds'),
  archivedAds: document.getElementById('metricArchivedAds'),
  totalViews: document.getElementById('metricTotalViews'),
  totalFavorites: document.getElementById('metricTotalFavorites'),
  inventoryValue: document.getElementById('metricInventoryValue'),
  averagePrice: document.getElementById('metricAveragePrice'),
  averageViews: document.getElementById('metricAverageViews')
};
const insightsContainer = document.getElementById('profileInsights');
const activityContainer = document.getElementById('profileActivity');

// Analytics panel
const kpisEls = {
  totalViews: document.getElementById('kpiTotalViews'),
  totalFavorites: document.getElementById('kpiTotalFavorites'),
  averageViews: document.getElementById('kpiAverageViews'),
  inventoryValue: document.getElementById('kpiInventoryValue')
};
const categoryChart = document.getElementById('analyticsCategoryChart');
const statusChart = document.getElementById('analyticsStatusChart');
const priceChart = document.getElementById('analyticsPriceChart');
const topAds = document.getElementById('analyticsTopAds');
const geoList = document.getElementById('analyticsGeoList');

// Settings panel
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

function formatRelativeTime(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `Il y a ${diffSec}s`;
  if (diffMin < 60) return `Il y a ${diffMin}m`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  return dateFormatter.format(date);
}

function showFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `profile-form-feedback ${type}`;
  setTimeout(() => {
    el.className = 'profile-form-feedback';
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

// === Focus Management ===
const focusableSelectors =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(e) {
  if (!drawerState.isOpen) return;
  const focusables = Array.from(drawer.querySelectorAll(focusableSelectors));
  const firstFocusable = focusables[0];
  const lastFocusable = focusables[focusables.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable?.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable?.focus();
    }
  }
}

function handleEscape(e) {
  if (e.key === 'Escape' && drawerState.isOpen) {
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

  // Chips
  if (roleChip) roleChip.textContent = user.role === 'admin' ? 'Admin' : 'Utilisateur';
  if (locationChip) {
    locationChip.textContent = user.location?.city ? `📍 ${user.location.city}` : '📍 —';
  }
  if (radiusChip) {
    radiusChip.textContent = user.location?.radiusKm
      ? `🔘 ${user.location.radiusKm} km`
      : '🔘 — km';
  }
  if (statusChip) statusChip.textContent = user.isActive ? '✓ Actif' : '⊗ Inactif';

  // Metrics
  if (stats?.summary) {
    const s = stats.summary;
    if (metricsEls.activeAds) {
      metricsEls.activeAds.textContent = numberFormatter.format(s.activeAds || 0);
    }
    if (metricsEls.draftAds) {
      metricsEls.draftAds.textContent = numberFormatter.format(s.draftAds || 0);
    }
    if (metricsEls.archivedAds) {
      metricsEls.archivedAds.textContent = numberFormatter.format(s.archivedAds || 0);
    }
    if (metricsEls.totalViews) {
      metricsEls.totalViews.textContent = numberFormatter.format(s.totalViews || 0);
    }
    if (metricsEls.totalFavorites) {
      metricsEls.totalFavorites.textContent = numberFormatter.format(s.totalFavorites || 0);
    }
    if (metricsEls.inventoryValue) {
      metricsEls.inventoryValue.textContent = currencyFormatter.format(s.inventoryValue || 0);
    }
    if (metricsEls.averagePrice) {
      metricsEls.averagePrice.textContent = currencyFormatter.format(s.averagePrice || 0);
    }
    if (metricsEls.averageViews) {
      metricsEls.averageViews.textContent = numberFormatter.format(s.averageViews || 0);
    }
  }

  // Insights (placeholder logic)
  if (insightsContainer) {
    const insights = [
      'Vos annonces en Mobilier performent bien cette semaine',
      `${stats?.summary?.totalViews || 0} vues au total ce mois`,
      'Pensez à actualiser vos prix régulièrement'
    ];
    insightsContainer.innerHTML = insights.map((text) => `<li>${text}</li>`).join('');
  }

  // Activity
  if (activityContainer && stats?.recentActivity) {
    if (stats.recentActivity.length === 0) {
      activityContainer.innerHTML = '<li>Aucune activité récente</li>';
    } else {
      activityContainer.innerHTML = stats.recentActivity
        .map(
          (activity) => `
        <li>
          <div class="profile-activity-info">
            <div class="profile-activity-type">${activity.type || 'Événement'}</div>
            <div class="profile-activity-title">${activity.title || '—'}</div>
            <div class="profile-activity-date">${formatRelativeTime(activity.date)}</div>
          </div>
          ${activity.price ? `<div class="profile-activity-price">${currencyFormatter.format(activity.price)}</div>` : ''}
        </li>
      `
        )
        .join('');
    }
  }
}

function renderAnalytics(analytics) {
  if (!analytics) return;

  // KPIs
  const overview = analytics.overview || {};
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
    const maxValue = Math.max(...analytics.categoryPerformance.map((c) => c.value), 1);
    categoryChart.innerHTML = analytics.categoryPerformance
      .map((item) => {
        const percent = (item.value / maxValue) * 100;
        return `
        <div class="profile-chart-bar">
          <div class="profile-chart-label">${item.category}</div>
          <div class="profile-chart-track">
            <div class="profile-chart-fill" style="width: ${percent}%">
              <span class="profile-chart-value">${numberFormatter.format(item.value)}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // Status breakdown
  if (statusChart && analytics.statusBreakdown) {
    const maxValue = Math.max(...analytics.statusBreakdown.map((s) => s.value), 1);
    statusChart.innerHTML = analytics.statusBreakdown
      .map((item) => {
        const percent = (item.value / maxValue) * 100;
        const label =
          item.status === 'active'
            ? 'Actives'
            : item.status === 'draft'
              ? 'Brouillons'
              : 'Archivées';
        return `
        <div class="profile-chart-bar">
          <div class="profile-chart-label">${label}</div>
          <div class="profile-chart-track">
            <div class="profile-chart-fill" style="width: ${percent}%">
              <span class="profile-chart-value">${numberFormatter.format(item.value)}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // Price distribution
  if (priceChart && analytics.priceDistribution) {
    const maxValue = Math.max(...analytics.priceDistribution.map((p) => p.value), 1);
    priceChart.innerHTML = analytics.priceDistribution
      .map((item) => {
        const percent = (item.value / maxValue) * 100;
        return `
        <div class="profile-chart-bar">
          <div class="profile-chart-label">${item.bucket}</div>
          <div class="profile-chart-track">
            <div class="profile-chart-fill" style="width: ${percent}%">
              <span class="profile-chart-value">${numberFormatter.format(item.value)}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
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
        .map(
          (loc) => `
        <li>${loc.city} (${numberFormatter.format(loc.value)})</li>
      `
        )
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
    logger.warn('Invalid file type');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/users/me/avatar', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.avatarUrl) {
      if (avatarImg) avatarImg.src = resolveAvatarSrc(result.avatarUrl);
      if (drawerState.data?.user) {
        drawerState.data.user.avatarUrl = result.avatarUrl;
      }
      logger.info('Avatar uploaded successfully');
    } else {
      logger.error('Avatar upload failed:', result.message);
    }
  } catch (err) {
    logger.error('Error uploading avatar:', err);
  }
}

async function onDeleteAccount() {
  const confirmation = window.confirm(
    'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible. Toutes vos données seront perdues.'
  );
  if (!confirmation) return;

  const doubleConfirm = window.prompt('Tapez "SUPPRIMER" pour confirmer :');
  if (doubleConfirm !== 'SUPPRIMER') {
    alert('Suppression annulée');
    return;
  }

  try {
    const response = await fetch('/api/users/me', {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      alert('Compte supprimé. Vous allez être déconnecté.');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } else {
      alert(result.message || 'Erreur lors de la suppression');
    }
  } catch (err) {
    logger.error('Error deleting account:', err);
    alert('Erreur réseau');
  }
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

      // Try to fetch stats and analytics (optional)
      const [statsRes, analyticsRes] = await Promise.allSettled([
        fetch('/api/users/me/stats').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/users/me/analytics').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const stats = statsRes.status === 'fulfilled' && statsRes.value ? statsRes.value : {
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

      const analytics = analyticsRes.status === 'fulfilled' && analyticsRes.value ? analyticsRes.value : {
        overview: { totalViews: 0, totalFavorites: 0, averageViews: 0, inventoryValue: 0 },
        categoryPerformance: [],
        statusBreakdown: [],
        priceDistribution: [],
        topPerformingAds: [],
        locationDistribution: []
      };

      return { user, stats, analytics };
    }

    // Fallback: try API if no authStore
    logger.warn('No authStore data, trying API');
    const [userRes, statsRes, analyticsRes] = await Promise.allSettled([
      fetch('/api/users/me').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/users/me/stats').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/users/me/analytics').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const apiUser = userRes.status === 'fulfilled' && userRes.value ? userRes.value : null;

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
      stats: statsRes.status === 'fulfilled' && statsRes.value ? statsRes.value : {
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
      },
      analytics: analyticsRes.status === 'fulfilled' && analyticsRes.value ? analyticsRes.value : {
        overview: { totalViews: 0, totalFavorites: 0, averageViews: 0, inventoryValue: 0 },
        categoryPerformance: [],
        statusBreakdown: [],
        priceDistribution: [],
        topPerformingAds: [],
        locationDistribution: []
      }
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

  // If no data provided, fetch it
  if (!data) {
    data = await fetchProfileData();
    if (!data) {
      logger.error('❌ Could not fetch profile data');
      return;
    }
    logger.info('✓ Data fetched:', data);
  }

  logger.info('✓ Opening drawer with data:', data.user?.name);

  drawerState.previousFocus = document.activeElement;
  drawerState.data = data;
  drawerState.isOpen = true;

  // Render
  renderHeader(data.user);
  renderOverview(data);
  renderAnalytics(data.analytics);
  renderSettings(data.user);

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

  // Focus first focusable element
  const firstFocusable = drawer.querySelector(focusableSelectors);
  firstFocusable?.focus();

  // Add listeners
  document.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', handleEscape);
  
  logger.info('🎉 Profile drawer opened successfully!');
}

function closeProfileDrawer() {
  if (!drawer || !drawerState.isOpen) return;

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

  // CTA
  createAdBtn?.addEventListener('click', () => {
    closeProfileDrawer();
    // Trigger new ad modal (external)
    window.showNewAdModal?.();
  });

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
