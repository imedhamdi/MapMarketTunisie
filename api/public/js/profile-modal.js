// ========== PROFILE MODAL ==========

function initProfileModal() {

  const profileModal = document.getElementById('profileModal');
  const profileOverlay = document.getElementById('profileOverlay');
  const profileClose = document.getElementById('profileClose');
  const profileTabs = document.querySelectorAll('.profile-tab');
  const profileTabContents = document.querySelectorAll('.profile-tab-content');
  const profileAdsFilters = document.querySelectorAll('.profile-filter-btn');
  const passwordForm = document.getElementById('profilePasswordForm');

  if (!profileModal) {
    console.error('Profile modal not found in DOM');
    return;
  }

  if (window.__profileModalInitialized) {
    return;
  }
  window.__profileModalInitialized = true;

  // Helper functions for body scroll lock
  const lockBodyScroll = () => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
  };

  const unlockBodyScroll = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  let currentFilter = 'all';
  let userAds = [];

  // Get API instance from global scope
  const getApi = () =>
    window.api || {
      get: async (url) => fetch(url, { credentials: 'include' }).then((r) => r.json()),
      post: async (url, data) =>
        fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then((r) => r.json()),
      delete: async (url) =>
        fetch(url, { method: 'DELETE', credentials: 'include' }).then((r) => r.json())
    };

  // Open profile modal
  function openProfileModal() {
    const user = window.authStore?.get();

    if (!user) {
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal();
      }
      return;
    }

    if (!profileModal || !profileOverlay) return;

    // If already open, just update content
    if (profileModal.classList.contains('mm-open')) {
      loadUserProfile(user);
      loadUserStats();
      loadUserAnalytics();
      loadRecentActivity();
      loadUserAds();
      return;
    }

    // Load user data
    loadUserProfile(user);
    loadUserStats();
    loadUserAnalytics();
    loadRecentActivity();
    loadUserAds();

    // Open modal with animation (same as favorites modal)
    profileOverlay.hidden = false;
    requestAnimationFrame(() => {
      profileOverlay.classList.add('active');
      profileModal.classList.add('mm-open');
      profileModal.setAttribute('aria-hidden', 'false');
    });
    
    lockBodyScroll();
  }

  // Close profile modal
  function closeProfileModal() {
    if (!profileModal || !profileOverlay) return;
    if (!profileModal.classList.contains('mm-open')) return;

    profileModal.classList.remove('mm-open');
    profileModal.setAttribute('aria-hidden', 'true');
    profileOverlay.classList.remove('active');
    
    setTimeout(() => {
      if (profileOverlay && !profileModal.classList.contains('mm-open')) {
        profileOverlay.hidden = true;
      }
    }, 250);
    
    unlockBodyScroll();
  }

  // Load user profile info
  function loadUserProfile(user) {
    const profileUserName = document.getElementById('profileUserName');
    if (profileUserName) {
      profileUserName.textContent = user.name || 'Utilisateur';
    }
    
    document.getElementById('profileEmail').textContent = user.email || '';

    // Avatar
    const avatarUrl = user.avatar
      ? `/uploads/avatars/${user.avatar}`
      : '/uploads/avatars/default.jpg';
    document.getElementById('profileAvatar').src = avatarUrl;

    // Member since
    if (user.memberSince || user.createdAt) {
      const date = new Date(user.memberSince || user.createdAt);
      const year = date.getFullYear();
      document.getElementById('profileMemberSince').textContent = `Membre depuis ${year}`;
    }
  }

  // Load user stats
  async function loadUserStats() {
    try {
      const api = getApi();
      const response = await api.get('/api/users/me/stats');
      if (response?.data?.stats) {
        const stats = response.data.stats;
        document.getElementById('statActiveAds').textContent = stats.active || 0;
        document.getElementById('statDraftAds').textContent = stats.draft || 0;
        document.getElementById('statTotalViews').textContent = stats.totalViews || 0;
        document.getElementById('statTotalFavorites').textContent = stats.totalFavorites || 0;

        // Update filter counts
        document.getElementById('filterAllCount').textContent = stats.total || 0;
        document.getElementById('filterActiveCount').textContent = stats.active || 0;
        document.getElementById('filterDraftCount').textContent = stats.draft || 0;
        document.getElementById('filterArchivedCount').textContent = stats.archived || 0;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Load user analytics
  async function loadUserAnalytics() {
    try {
      const api = getApi();
      const response = await api.get('/api/users/me/analytics');
      if (response?.data?.analytics) {
        const analytics = response.data.analytics;
        
        // Update overview metrics
        const overview = analytics.overview || {};
        const analyticsViewsEl = document.getElementById('analyticsViews');
        const analyticsContactsEl = document.getElementById('analyticsContacts');
        const analyticsEngagementEl = document.getElementById('analyticsEngagement');
        const analyticsConversionEl = document.getElementById('analyticsConversion');
        const analyticsViewsChangeEl = document.getElementById('analyticsViewsChange');
        const analyticsContactsChangeEl = document.getElementById('analyticsContactsChange');
        
        if (analyticsViewsEl) analyticsViewsEl.textContent = overview.totalViews || 0;
        if (analyticsContactsEl) analyticsContactsEl.textContent = overview.totalContacts || 0;
        if (analyticsEngagementEl) analyticsEngagementEl.textContent = `${overview.engagementRate || 0}%`;
        if (analyticsConversionEl) analyticsConversionEl.textContent = `${overview.conversionRate || 0}%`;
        
        // Update changes (mock data for now - could be calculated from previous period)
        if (analyticsViewsChangeEl) analyticsViewsChangeEl.textContent = '+12%';
        if (analyticsContactsChangeEl) analyticsContactsChangeEl.textContent = '+8%';
        
        // Update top performing ads
        const topAds = analytics.topPerformingAds || [];
        const topPerformingContainer = document.getElementById('topPerformingAds');
        if (topPerformingContainer) {
          if (topAds.length === 0) {
            topPerformingContainer.innerHTML = '<p style="color: var(--color-text-secondary); padding: 16px;">Aucune donnée disponible</p>';
          } else {
            topPerformingContainer.innerHTML = topAds.map(ad => `
              <div class="analytics-list-item">
                <div class="analytics-list-info">
                  <div class="analytics-list-title">${ad.title}</div>
                  <div class="analytics-list-meta">${ad.category} • ${ad.city}</div>
                </div>
                <div class="analytics-list-stats">
                  <span>👁️ ${ad.views}</span>
                  <span>❤️ ${ad.favorites}</span>
                  <span>💬 ${ad.contacts}</span>
                </div>
              </div>
            `).join('');
          }
        }
        
        // Update traffic sources (mock percentages based on city/category stats)
        const totalViews = overview.totalViews || 1;
        const trafficDirectEl = document.getElementById('trafficDirect');
        const trafficDirectValueEl = document.getElementById('trafficDirectValue');
        const trafficMapEl = document.getElementById('trafficMap');
        const trafficMapValueEl = document.getElementById('trafficMapValue');
        const trafficFavoritesEl = document.getElementById('trafficFavorites');
        const trafficFavoritesValueEl = document.getElementById('trafficFavoritesValue');
        
        if (trafficDirectEl) trafficDirectEl.style.width = '60%';
        if (trafficDirectValueEl) trafficDirectValueEl.textContent = '60%';
        if (trafficMapEl) trafficMapEl.style.width = '30%';
        if (trafficMapValueEl) trafficMapValueEl.textContent = '30%';
        if (trafficFavoritesEl) trafficFavoritesEl.style.width = '10%';
        if (trafficFavoritesValueEl) trafficFavoritesValueEl.textContent = '10%';
        
        // Update best time/day (mock data)
        const analyticsBestTimeEl = document.getElementById('analyticsBestTime');
        const analyticsBestDayEl = document.getElementById('analyticsBestDay');
        if (analyticsBestTimeEl) analyticsBestTimeEl.textContent = '14h-18h';
        if (analyticsBestDayEl) analyticsBestDayEl.textContent = 'Dimanche';
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  // Load recent activity
  async function loadRecentActivity() {
    try {
      const user = window.authStore?.get();
      if (!user?._id) return;

      const api = getApi();
      // Get recent ads to display as activity
      const response = await api.get(`/api/ads?owner=${user._id}&limit=5&sort=-createdAt`);
      const recentAds = response?.data?.ads || [];
      
      const container = document.getElementById('recentActivityContainer');
      if (!container) return;

      if (recentAds.length === 0) {
        container.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--color-text-secondary);">
            <div style="font-size: 48px; margin-bottom: 8px;">📭</div>
            <p>Aucune activité récente</p>
          </div>
        `;
        return;
      }

      container.innerHTML = recentAds.map(ad => {
        const date = new Date(ad.createdAt || ad.date);
        const timeAgo = getTimeAgo(date);
        const statusIcon = ad.status === 'active' ? '✅' : ad.status === 'draft' ? '📝' : '📦';
        const statusText = ad.status === 'active' ? 'Publiée' : ad.status === 'draft' ? 'Brouillon' : 'Archivée';
        
        return `
          <div class="activity-item" style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border);">
            <div style="font-size: 24px;">${statusIcon}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--color-text-primary);">${ad.title}</div>
              <div style="font-size: 14px; color: var(--color-text-secondary); margin-top: 4px;">
                ${statusText} • ${timeAgo} • ${ad.views || 0} vues
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  // Helper function to get time ago
  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'À l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    return `Il y a ${months} mois`;
  }

  // Load user ads
  async function loadUserAds() {
    try {
      const user = window.authStore?.get();
      if (!user?._id) {
        return;
      }

      const api = getApi();

      // Fetch all user ads (active, draft, archived)
      const [activeRes, draftRes, archivedRes] = await Promise.all([
        api.get(`/api/ads?owner=${user._id}&status=active&limit=100`),
        api.get(`/api/ads?owner=${user._id}&status=draft&limit=100`),
        api.get(`/api/ads?owner=${user._id}&status=archived&limit=100`)
      ]);

      userAds = [
        ...(activeRes?.data?.items || []),
        ...(draftRes?.data?.items || []),
        ...(archivedRes?.data?.items || [])
      ];

      renderUserAds();
    } catch (error) {
      console.error('Error loading user ads:', error);
      // Try alternative approach - single request without status filter
      try {
        const user = window.authStore?.get();
        const api = getApi();
        const response = await api.get(`/api/ads?owner=${user._id}&limit=100`);
        userAds = response?.data?.items || [];
        renderUserAds();
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError);
      }
    }
  }

  // Render user ads
  function renderUserAds() {
    const grid = document.getElementById('profileAdsGrid');
    const emptyState = document.getElementById('profileAdsEmpty');

    // Filter ads
    let filteredAds = userAds;
    if (currentFilter !== 'all') {
      filteredAds = userAds.filter((ad) => ad.status === currentFilter);
    }

    if (filteredAds.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = filteredAds
      .map((ad) => {
        const imageUrl =
          ad.thumbnails && ad.thumbnails.length > 0
            ? ad.thumbnails[0]
            : ad.images && ad.images.length > 0
              ? ad.images[0]
              : 'https://via.placeholder.com/400x300?text=No+Image';

        const statusLabel =
          {
            active: 'Active',
            draft: 'Brouillon',
            archived: 'Archivée'
          }[ad.status] || ad.status;

        return `
        <div class="profile-ad-card" data-ad-id="${ad._id}">
          <div style="position: relative;">
            <img class="profile-ad-image" src="${imageUrl}" alt="${ad.title || ''}" loading="lazy" decoding="async" />
            <div class="profile-ad-status ${ad.status}">${statusLabel}</div>
          </div>
          <div class="profile-ad-body">
            <h4 class="profile-ad-title">${ad.title || 'Sans titre'}</h4>
            <div class="profile-ad-meta">
              <div class="profile-ad-price">${ad.price ? ad.price.toFixed(2) + ' €' : 'N/A'}</div>
              <div class="profile-ad-stats">
                <span class="profile-ad-stat" title="Vues">
                  👁️ ${ad.views || 0}
                </span>
                <span class="profile-ad-stat" title="Favoris">
                  ❤️ ${ad.favoritesCount || 0}
                </span>
              </div>
            </div>
            <div class="profile-ad-actions">
              <button class="profile-ad-btn" data-action="view" data-ad-id="${ad._id}">
                👁️ Voir
              </button>
              <button class="profile-ad-btn" data-action="edit" data-ad-id="${ad._id}">
                ✏️ Modifier
              </button>
              ${
  ad.status !== 'archived'
    ? `
                <button class="profile-ad-btn danger" data-action="delete" data-ad-id="${ad._id}">
                  🗑️
                </button>
              `
    : ''
}
            </div>
          </div>
        </div>
      `;
      })
      .join('');
    
    // Add event listeners for ad action buttons
    grid.querySelectorAll('.profile-ad-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const adId = btn.dataset.adId;
        
        if (action === 'view') {
          viewAdDetails(adId);
        } else if (action === 'edit') {
          editAd(adId);
        } else if (action === 'delete') {
          deleteAd(adId);
        }
      });
    });
  }

  // View ad details
  function viewAdDetails(adId) {
    closeProfileModal();
    if (typeof window.openDetailsById === 'function') {
      window.openDetailsById(adId);
    }
  }

  // Edit ad
  async function editAd(adId) {
    if (!adId) return;

    try {
      // Close profile modal
      closeProfileModal();

      // Check if openEditModal is available
      if (typeof window.openEditModal === 'function') {
        window.openEditModal(adId);
      } else {
        // Fallback: show toast
        if (typeof window.showToast === 'function') {
          window.showToast('Chargement de l\'éditeur...');
        }
        // Try to open details modal and show edit button
        if (typeof window.openDetailsById === 'function') {
          window.openDetailsById(adId);
        }
      }
    } catch (error) {
      console.error('Error opening edit modal:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Erreur lors de l\'ouverture de l\'éditeur');
      }
    }
  }

  // Delete ad
  async function deleteAd(adId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }

    try {
      const api = getApi();
      await api.delete(`/api/ads/${adId}`);
      if (typeof window.showToast === 'function') {
        window.showToast('Annonce supprimée avec succès');
      }
      userAds = userAds.filter((a) => a._id !== adId);
      renderUserAds();
      loadUserStats();
    } catch (error) {
      console.error('Error deleting ad:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Erreur lors de la suppression');
      }
    }
  }

    // Tab switching
  profileTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      profileTabs.forEach((t) => {
        t.classList.remove('active');
        t.style.color = 'var(--color-text-secondary)';
        t.style.borderBottomColor = 'transparent';
      });
      tab.classList.add('active');
      tab.style.color = 'var(--color-brand-500)';
      tab.style.borderBottomColor = 'var(--color-brand-500)';

      // Update active content
      profileTabContents.forEach((content) => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
          content.style.display = 'block';
        } else {
          content.classList.remove('active');
          content.style.display = 'none';
        }
      });
    });
  });

    // Filter ads
  profileAdsFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;

      // Update active filter button
      profileAdsFilters.forEach((b) => {
        b.classList.remove('active');
        b.style.background = 'var(--color-surface)';
        b.style.color = 'var(--color-text-primary)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--color-brand-500)';
      btn.style.color = 'white';

      renderUserAds();
    });
  });

  // Password form
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Clear errors
      document.querySelectorAll('.profile-form-error').forEach((el) => {
        el.textContent = '';
        el.style.display = 'none';
      });

      // Validation
      if (newPassword.length < 8) {
        const errorEl = document.getElementById('newPasswordError');
        errorEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères';
        errorEl.style.display = 'block';
        return;
      }

      if (newPassword !== confirmPassword) {
        const errorEl = document.getElementById('confirmPasswordError');
        errorEl.textContent = 'Les mots de passe ne correspondent pas';
        errorEl.style.display = 'block';
        return;
      }

      const submitBtn = document.getElementById('passwordSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Modification en cours...';

      try {
        const api = getApi();
        await api.post('/api/users/me/change-password', {
          currentPassword,
          newPassword
        });

        if (typeof window.showToast === 'function') {
          window.showToast('Mot de passe modifié avec succès');
        }
        passwordForm.reset();
      } catch (error) {
        console.error('Error changing password:', error);
        const errorEl = document.getElementById('currentPasswordError');
        errorEl.textContent =
          error.response?.data?.message || 'Erreur lors du changement de mot de passe';
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Changer le mot de passe';
      }
    });
  }

  // Avatar upload functionality
  const avatarInput = document.getElementById('profileAvatarInput');
  const avatarWrapper = document.getElementById('profileAvatarWrapper');
  const avatarImg = document.getElementById('profileAvatar');

  // Click on wrapper triggers file input
  avatarWrapper?.addEventListener('click', () => {
    avatarInput?.click();
  });

  // Handle avatar file selection
  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      if (typeof window.showToast === 'function') {
        window.showToast('Veuillez sélectionner une image');
      }
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      if (typeof window.showToast === 'function') {
        window.showToast('L\'image ne doit pas dépasser 5 Mo');
      }
      return;
    }

    try {
      // Show loading state
      avatarWrapper?.classList.add('loading');

      // Create FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload avatar
      const response = await fetch('/api/users/me/avatar', {
        method: 'PATCH',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();

      // Update avatar preview
      if (data?.data?.user?.avatar) {
        const newAvatarUrl = `/uploads/avatars/${data.data.user.avatar}?t=${Date.now()}`;
        avatarImg.src = newAvatarUrl;
        
        // Update auth store if available
        if (window.authStore) {
          const user = window.authStore.get();
          if (user) {
            user.avatar = data.data.user.avatar;
            window.authStore.set(user);
          }
        }

        if (typeof window.showToast === 'function') {
          window.showToast('Avatar mis à jour avec succès');
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Erreur lors de la mise à jour de l\'avatar');
      }
    } finally {
      avatarWrapper?.classList.remove('loading');
      // Reset input to allow selecting the same file again
      if (avatarInput) avatarInput.value = '';
    }
  });

  // Close modal
  profileClose?.addEventListener('click', closeProfileModal);

  // Close on overlay click
  profileOverlay?.addEventListener('click', (e) => {
    if (e.target === profileOverlay) {
      closeProfileModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profileModal.classList.contains('mm-open')) {
      closeProfileModal();
    }
  });

  // Expose open function globally
  window.openProfileModal = openProfileModal;
  window.closeProfileModal = closeProfileModal;

}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initProfileModal();
  });
} else {
  initProfileModal();
}

window.profileModalInit = initProfileModal;
