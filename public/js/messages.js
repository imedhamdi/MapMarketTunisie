(function () {
  'use strict';

  const SOCKET_PATH = '/ws/chat';
  const API_BASE = window.__API_BASE__ || `${window.location.origin}/api/v1`;
  const CONVERSATION_LIMIT = 60;
  const MESSAGE_LIMIT = 80;

  let socket = null;
  let isConnected = false;
  let activeConversationId = null;
  let readFlushTimer = null;
  let typingTimer = null;

  const pendingRead = new Set();
  const pendingMessages = new Map();

  const state = {
    conversations: [],
    filteredConversations: [],
    messagesByConversation: new Map(),
    searchTerm: '',
    conversationsLoaded: false,
    loadingConversations: false,
    loadingMessages: false,
    dismissedBanner: localStorage.getItem('mm-chat-security-dismissed') === '1',
    user: null,
    userId: null,
    unreadTotal: 0,
    activeParticipantAvatar: null
  };

  const dom = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();
    bindUiEvents();
    hydrateUser();
    renderConversations();
    renderEmptyMessages();
    updateStatusIndicator();
  }

  function cacheDom() {
    dom.overlay = document.getElementById('messagesOverlay');
    dom.modal = document.getElementById('messagesModal');
    dom.openTop = document.getElementById('navMessages');
    dom.openBottom = document.querySelector('.bn-btn[data-action="messages"]');
    dom.close = document.getElementById('messagesClose');
    dom.messagesLayout = document.getElementById('messagesLayout');
    dom.messagesStatus = document.getElementById('messagesStatus');
    dom.messagesStatusText = dom.messagesStatus?.querySelector('.messages-status__text');
    dom.messagesUnreadBadge = document.getElementById('messagesUnreadBadge');
    dom.searchInput = document.getElementById('messagesSearch');
    dom.sidebar = document.getElementById('messagesSidebar');
    dom.conversationsList = document.getElementById('conversationsList');
    dom.conversationsEmpty = document.getElementById('conversationsEmpty');
    dom.chatPanel = document.getElementById('chatPanel');
    dom.chatBack = document.getElementById('chatBack');
    dom.chatDelete = document.getElementById('chatDelete');
    dom.chatTitle = document.getElementById('chatTitle');
    dom.chatSubtitle = document.getElementById('chatSubtitle');
    dom.chatBanner = document.getElementById('chatSecurityBanner');
    dom.chatBannerClose = document.getElementById('chatBannerClose');
    dom.messagesWrapper = document.querySelector('.chat-panel__messages-wrapper');
    dom.chatMessages = document.getElementById('chatMessages');
    dom.typingIndicator = document.getElementById('typingIndicator');
    dom.scrollToBottom = document.getElementById('scrollToBottom');
    dom.chatTextarea = document.getElementById('chatTextarea');
    dom.chatSend = document.getElementById('chatSend');
    dom.chatInputNote = document.getElementById('chatInputNote');
  }

  function bindUiEvents() {
    dom.openTop?.addEventListener('click', handleOpenModal);
    dom.openBottom?.addEventListener('click', handleOpenModal);
    dom.close?.addEventListener('click', closeModal);
    dom.overlay?.addEventListener('click', closeModal);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dom.modal?.classList.contains('mm-open')) {
        event.preventDefault();
        closeModal();
      }
    });

    dom.searchInput?.addEventListener('input', handleSearchInput);
    dom.chatBack?.addEventListener('click', handleBackToList);
    dom.chatDelete?.addEventListener('click', handleHideConversation);
    dom.chatBannerClose?.addEventListener('click', dismissSecurityBanner);
    dom.scrollToBottom?.addEventListener('click', () =>
      scrollMessagesToBottom({ smooth: true, force: true })
    );

    if (dom.chatTextarea && dom.chatSend) {
      dom.chatTextarea.addEventListener('input', handleTextareaInput);
      dom.chatTextarea.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          handleSendMessage();
        }
      });
      dom.chatSend.addEventListener('click', handleSendMessage);
    }

    dom.conversationsList?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-conversation-id]');
      if (!button) return;
      const conversationId = button.getAttribute('data-conversation-id');
      if (conversationId) {
        selectConversation(conversationId);
      }
    });

    document.addEventListener('auth:change', handleAuthChange);
    document.addEventListener('chat:conversation-started', handleConversationStartedEvent);
  }

  function hydrateUser() {
    state.user = getCurrentUser();
    state.userId = state.user?._id ? String(state.user._id) : null;
    if (!state.userId) {
      resetState();
      renderUnauthenticated();
    }
  }

  function handleAuthChange(event) {
    state.user = event?.detail ?? getCurrentUser();
    state.userId = state.user?._id ? String(state.user._id) : null;
    resetState();
    if (!state.userId) {
      renderUnauthenticated();
    } else if (dom.modal?.classList.contains('mm-open')) {
      loadConversations({ force: true });
    }
  }

  function getCurrentUser() {
    try {
      if (window.authStore && typeof window.authStore.get === 'function') {
        return window.authStore.get();
      }
    } catch (error) {
      console.warn('[chat] impossible de lire authStore', error);
    }
    return null;
  }

  function resetState() {
    activeConversationId = null;
    state.conversations = [];
    state.filteredConversations = [];
    state.messagesByConversation.clear();
    state.conversationsLoaded = false;
    state.loadingConversations = false;
    state.loadingMessages = false;
    state.searchTerm = '';
    state.unreadTotal = 0;
    pendingRead.clear();
    pendingMessages.clear();
    if (readFlushTimer) {
      clearTimeout(readFlushTimer);
      readFlushTimer = null;
    }
    updateUnreadBadge();
    renderConversations();
    renderEmptyMessages();
    hideChatPanel();
  }

  function renderUnauthenticated() {
    if (!dom.modal) return;
    showConversationsEmpty({
      icon: '🔐',
      title: 'Messagerie réservée',
      text: 'Connectez-vous pour retrouver vos conversations.'
    });
    hideChatPanel();
  }

  function handleOpenModal(event) {
    event.preventDefault();
    openModal();
  }

  function openModal({ conversationId = null } = {}) {
    if (!dom.modal) return;
    hydrateUser();
    if (!state.userId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Connectez-vous pour ouvrir la messagerie.');
      }
      renderUnauthenticated();
    } else {
      ensureSocket();
      if (!state.conversationsLoaded && !state.loadingConversations) {
        loadConversations();
      }
    }
    if (conversationId) {
      pendingSelectConversationId = conversationId;
      if (state.conversationsLoaded) {
        selectConversationIfAvailable(conversationId);
      }
    }
    dom.overlay?.classList.add('active');
    dom.overlay?.setAttribute('aria-hidden', 'false');
    dom.modal.classList.add('mm-open');
    dom.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!dom.modal) return;
    dom.modal.classList.remove('mm-open');
    dom.modal.setAttribute('aria-hidden', 'true');
    dom.overlay?.classList.remove('active');
    dom.overlay?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function ensureSocket() {
    if (socket || !state.userId) return socket;
    if (!window.io) {
      console.warn('[chat] Socket.IO client manquant');
      return null;
    }
    const token = window.__ACCESS_TOKEN__ || null;
    socket = window.io(window.location.origin, {
      path: SOCKET_PATH,
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 6,
      reconnectionDelay: 750,
      timeout: 20000
    });
    bindSocketEvents();
    return socket;
  }

  function bindSocketEvents() {
    if (!socket) return;
    socket.on('connect', () => {
      isConnected = true;
      updateStatusIndicator();
      if (activeConversationId) {
        socket.emit('conversation:join', {
          conversationId: activeConversationId,
          markAsRead: true
        });
      }
    });
    socket.on('disconnect', (reason) => {
      isConnected = false;
      updateStatusIndicator(reason || null);
    });
    socket.on('reconnect_attempt', () => {
      updateStatusIndicator('Reconnexion…');
    });
    socket.on('error', (payload) => {
      console.warn('[chat:error]', payload);
      updateStatusIndicator(payload?.message || 'Erreur');
    });
    socket.on('message:new', async (payload) => {
      await handleIncomingMessage(payload);
    });
    socket.on('message:delivered', (payload) => {
      updateMessageStatus(payload.messageId, 'delivered', payload.deliveredAt);
    });
    socket.on('message:read', (payload) => {
      if (!payload?.messageIds?.length) return;
      payload.messageIds.forEach((id) => updateMessageStatus(id, 'read', payload.readAt));
    });
    socket.on('typing:start', ({ conversationId, userId }) => {
      if (conversationId === activeConversationId && userId !== state.userId) {
        showTypingIndicator(conversationId);
      }
    });
    socket.on('typing:stop', ({ conversationId, userId }) => {
      if (conversationId === activeConversationId && userId !== state.userId) {
        hideTypingIndicator();
      }
    });
  }

  async function loadConversations({ force = false } = {}) {
    if (state.loadingConversations) return;
    if (!force && state.conversationsLoaded && state.conversations.length) return;

    state.loadingConversations = true;
    showConversationsSkeleton();
    try {
      const data = await apiFetch('/chat/conversations', {
        query: { limit: CONVERSATION_LIMIT }
      });
      const conversations = Array.isArray(data) ? data : [];
      state.conversations = conversations.map(enhanceConversation);
      sortConversations(state.conversations);
      state.filteredConversations = [...state.conversations];
      state.conversationsLoaded = true;
      state.unreadTotal = state.conversations.reduce(
        (acc, conversation) => acc + (conversation.unreadCount || 0),
        0
      );
      applySearch();
      updateUnreadBadge();
      if (!state.conversations.length) {
        showConversationsEmpty({
          icon: '💬',
          title: 'Aucun message',
          text: 'Vos conversations apparaîtront ici.'
        });
      } else {
        hideConversationsEmpty();
      }
    } catch (error) {
      console.error('[chat] Impossible de charger les conversations', error);
      showConversationsEmpty({
        icon: '⚠️',
        title: 'Chargement impossible',
        text: error.message || 'Vérifiez votre connexion.'
      });
    } finally {
      state.loadingConversations = false;
      if (pendingSelectConversationId) {
        selectConversationIfAvailable(pendingSelectConversationId);
      }
    }
  }

  async function fetchConversationById(conversationId) {
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}`);
      const conversation = data?.conversation || data;
      return conversation ? enhanceConversation(conversation) : null;
    } catch (error) {
      console.warn('[chat] Conversation introuvable', conversationId, error);
      return null;
    }
  }

  async function handleIncomingMessage(payload) {
    if (!payload?.conversationId || !payload?.message) return;
    const conversationId = String(payload.conversationId);
    const message = enhanceMessage(payload.message);

    let conversation = findConversation(conversationId);
    const alreadyKnown = Boolean(conversation);
    if (!alreadyKnown) {
      conversation = await fetchConversationById(conversationId);
      if (!conversation) return;
      upsertConversation(conversation);
      applySearch();
    }

    updateConversationPreview(conversationId, message);
    storeMessage(conversationId, message);

    if (conversationId === activeConversationId) {
      insertMessageIntoActive(message);
      if (message.sender !== state.userId) {
        socket?.emit('message:received', { conversationId, messageId: message.id });
        scheduleMarkRead(message.id);
        hideTypingIndicator();
      }
      markConversationAsRead(conversationId);
    } else if (message.sender !== state.userId) {
      incrementConversationUnread(conversationId);
    }

    moveConversationToTop(conversationId);
    applySearch();
  }

  async function loadMessages(conversationId, { force = false } = {}) {
    if (state.loadingMessages) return;
    const existing = state.messagesByConversation.get(conversationId);
    if (existing?.length && !force) {
      renderMessages(conversationId);
      scrollMessagesToBottom({ smooth: false });
      return;
    }

    state.loadingMessages = true;
    showMessagesSkeleton();
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        query: { limit: MESSAGE_LIMIT }
      });
      const messages = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data)
          ? data
          : [];
      const formatted = messages.map(enhanceMessage).sort((a, b) => a.createdAt - b.createdAt);
      state.messagesByConversation.set(conversationId, formatted);
      renderMessages(conversationId);
      scrollMessagesToBottom({ smooth: false, force: true });
    } catch (error) {
      console.error('[chat] Chargement des messages échoué', error);
      showMessagesError(error?.message || 'Impossible de charger cette conversation.');
    } finally {
      state.loadingMessages = false;
    }
  }

  function enhanceConversation(raw) {
    if (!raw) return null;
    const id = String(raw.id || raw._id);
    const lastMessageAt = raw.lastMessageAt ? new Date(raw.lastMessageAt) : null;
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
    const other = raw.otherParticipant || null;
    const ad = raw.ad || null;
    const title = ad?.title || raw.lastMessagePreview || 'Conversation';
    return {
      id,
      ad,
      adId: raw.adId ? String(raw.adId) : null,
      title,
      otherParticipant: other
        ? {
            id: other.id ? String(other.id) : String(other),
            name: other.name || 'Contact',
            avatar: other.avatar || null
          }
        : null,
      lastMessage: raw.lastMessage || null,
      lastMessagePreview: raw.lastMessagePreview || '',
      lastMessageAt,
      createdAt,
      unreadCount: raw.unreadCount || 0,
      isBlocked: Boolean(raw.isBlocked),
      blockedBy: raw.blockedBy || null,
      hidden: Boolean(raw.hidden)
    };
  }

  function enhanceMessage(raw) {
    if (!raw) return null;
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
    const deliveredAt = raw.deliveredAt ? new Date(raw.deliveredAt) : null;
    const readAt = raw.readAt ? new Date(raw.readAt) : null;
    return {
      id: String(raw.id || raw._id),
      clientTempId: raw.clientTempId || null,
      conversationId: String(raw.conversationId || raw.conversation || raw.conversationId),
      sender: raw.sender ? String(raw.sender) : null,
      recipient: raw.recipient ? String(raw.recipient) : null,
      text: raw.text || '',
      attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
      status: raw.status || 'sent',
      createdAt,
      deliveredAt,
      readAt
    };
  }

  function findConversation(conversationId) {
    return state.conversations.find((conversation) => conversation.id === conversationId) || null;
  }

  function upsertConversation(conversation) {
    if (!conversation) return;
    const index = state.conversations.findIndex((c) => c.id === conversation.id);
    if (index >= 0) {
      state.conversations[index] = conversation;
    } else {
      state.conversations.push(conversation);
    }
    sortConversations(state.conversations);
    state.filteredConversations = [...state.conversations];
  }

  function sortConversations(list) {
    list.sort((a, b) => {
      const aDate = a.lastMessageAt || a.createdAt || new Date(0);
      const bDate = b.lastMessageAt || b.createdAt || new Date(0);
      return bDate - aDate;
    });
  }

  function applySearch() {
    const term = state.searchTerm.trim().toLowerCase();
    if (!term) {
      state.filteredConversations = [...state.conversations];
    } else {
      state.filteredConversations = state.conversations.filter((conversation) => {
        const haystack = [
          conversation.title,
          conversation.otherParticipant?.name,
          conversation.lastMessagePreview
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    renderConversations();
  }

  function renderConversations() {
    if (!dom.conversationsList) return;
    dom.conversationsList.innerHTML = '';
    if (!state.filteredConversations.length) {
      if (!state.loadingConversations) {
        showConversationsEmpty(
          state.searchTerm
            ? {
                icon: '🔍',
                title: 'Aucun résultat',
                text: 'Aucune conversation ne correspond à votre recherche.'
              }
            : undefined
        );
      }
      return;
    }
    hideConversationsEmpty();

    const fragment = document.createDocumentFragment();
    state.filteredConversations.forEach((conversation) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'conversation-item';
      button.setAttribute('data-conversation-id', conversation.id);
      if (conversation.id === activeConversationId) {
        button.classList.add('is-active');
      }
      if (conversation.unreadCount > 0) {
        button.classList.add('has-unread');
      }

      const avatar = document.createElement('span');
      avatar.className = 'conversation-item__avatar';
      avatar.innerHTML = buildAvatar(conversation);

      const body = document.createElement('span');
      body.className = 'conversation-item__body';

      const topLine = document.createElement('div');
      topLine.className = 'conversation-item__top';

      const title = document.createElement('span');
      title.className = 'conversation-item__title';
      title.textContent = conversation.title || 'Conversation';
      topLine.appendChild(title);

      const time = document.createElement('time');
      time.className = 'conversation-item__time';
      if (conversation.lastMessageAt) {
        time.dateTime = conversation.lastMessageAt.toISOString();
        time.textContent = formatRelativeTime(conversation.lastMessageAt);
      }
      topLine.appendChild(time);

      const bottomLine = document.createElement('div');
      bottomLine.className = 'conversation-item__bottom';

      const partner = document.createElement('span');
      partner.className = 'conversation-item__partner';
      partner.textContent = conversation.otherParticipant?.name || 'Contact';
      bottomLine.appendChild(partner);

      const preview = document.createElement('span');
      preview.className = 'conversation-item__preview';
      preview.textContent = conversation.lastMessagePreview || 'Nouvelle conversation';
      bottomLine.appendChild(preview);

      body.appendChild(topLine);
      body.appendChild(bottomLine);

      button.appendChild(avatar);
      button.appendChild(body);

      if (conversation.unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'conversation-item__badge';
        badge.textContent =
          conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount);
        button.appendChild(badge);
      }

      fragment.appendChild(button);
    });

    dom.conversationsList.appendChild(fragment);
  }

  function buildAvatar(conversation) {
    const image = conversation.otherParticipant?.avatar || conversation.ad?.thumbnail || null;
    if (image) {
      return `<span class="conversation-item__avatar-img" style="background-image:url('${encodeURI(
        image
      )}')"></span>`;
    }
    const name = conversation.otherParticipant?.name || conversation.title || '';
    const letter = name.charAt(0).toUpperCase() || '?';
    return `<span class="conversation-item__avatar-fallback">${letter}</span>`;
  }

  function showConversationsSkeleton() {
    if (!dom.conversationsList) return;
    dom.conversationsList.innerHTML = '';
    hideConversationsEmpty();
    for (let index = 0; index < 4; index += 1) {
      const skeleton = document.createElement('div');
      skeleton.className = 'conversation-item conversation-item--skeleton';
      skeleton.innerHTML = `
        <span class="conversation-item__avatar"><span class="skeleton-circle"></span></span>
        <span class="conversation-item__body">
          <span class="skeleton-line skeleton-line--md"></span>
          <span class="skeleton-line skeleton-line--sm"></span>
        </span>
      `;
      dom.conversationsList.appendChild(skeleton);
    }
  }

  function showConversationsEmpty(content) {
    if (!dom.conversationsEmpty) return;
    const icon = dom.conversationsEmpty.querySelector('.conversations-list__empty-icon');
    const title = dom.conversationsEmpty.querySelector('.conversations-list__empty-title');
    const text = dom.conversationsEmpty.querySelector('.conversations-list__empty-text');
    if (content?.icon && icon) icon.textContent = content.icon;
    if (content?.title && title) title.textContent = content.title;
    if (content?.text && text) text.textContent = content.text;
    dom.conversationsEmpty.hidden = false;
  }

  function hideConversationsEmpty() {
    if (dom.conversationsEmpty) {
      dom.conversationsEmpty.hidden = true;
    }
  }

  function renderEmptyMessages() {
    if (!dom.chatMessages) return;
    dom.chatMessages.innerHTML =
      '<div class="chat-panel__empty">Sélectionnez une conversation pour lire vos échanges.</div>';
  }

  function showMessagesSkeleton() {
    if (!dom.chatMessages) return;
    dom.chatMessages.innerHTML = '';
    dom.chatMessages.classList.add('is-loading');
    for (let index = 0; index < 6; index += 1) {
      const bubble = document.createElement('div');
      bubble.className = 'message-row message-row--skeleton';
      bubble.innerHTML = `
        <span class="message-bubble">
          <span class="skeleton-line skeleton-line--md"></span>
          <span class="skeleton-line skeleton-line--xs"></span>
        </span>
      `;
      dom.chatMessages.appendChild(bubble);
    }
  }

  function showMessagesError(message) {
    if (!dom.chatMessages) return;
    dom.chatMessages.classList.remove('is-loading');
    dom.chatMessages.innerHTML = `<div class="chat-panel__empty">${escapeHtml(message)}</div>`;
  }

  function selectConversation(conversationId) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;

    if (activeConversationId && activeConversationId !== conversationId) {
      socket?.emit('conversation:leave', { conversationId: activeConversationId });
    }

    activeConversationId = conversationId;
    state.activeParticipantAvatar = conversation.otherParticipant?.avatar || null;
    highlightSelectedConversation(conversationId);
    showChatPanel(conversation);
    joinConversation(conversationId, { markAsRead: true });
    markConversationAsRead(conversationId);
    loadMessages(conversationId);
    pendingSelectConversationId = null;
  }

  function selectConversationIfAvailable(conversationId) {
    if (!conversationId) return;
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    if (dom.modal?.classList.contains('mm-open')) {
      selectConversation(conversationId);
    }
  }

  function highlightSelectedConversation(conversationId) {
    if (!dom.conversationsList) return;
    dom.conversationsList.querySelectorAll('.conversation-item').forEach((node) => {
      const id = node.getAttribute('data-conversation-id');
      if (id === conversationId) {
        node.classList.add('is-active');
      } else {
        node.classList.remove('is-active');
      }
    });
  }

  function showChatPanel(conversation) {
    if (!dom.chatPanel) return;
    dom.chatPanel.classList.remove('chat-panel--hidden');
    dom.messagesLayout?.classList.add('messages-layout--detail');
    dom.chatTitle.textContent = conversation.title || 'Conversation';
    const partner = conversation.otherParticipant?.name || 'Contact';
    const adTitle = conversation.ad?.title || '';
    dom.chatSubtitle.textContent = adTitle ? `${partner} • ${adTitle}` : partner;
    dom.chatDelete.hidden = false;
    dom.chatDelete.disabled = false;
    if (dom.chatBanner) {
      if (state.dismissedBanner) {
        dom.chatBanner.setAttribute('hidden', 'true');
      } else {
        dom.chatBanner.removeAttribute('hidden');
      }
    }
  }

  function hideChatPanel() {
    dom.chatPanel?.classList.add('chat-panel--hidden');
    dom.messagesLayout?.classList.remove('messages-layout--detail');
    renderEmptyMessages();
    dom.chatDelete && (dom.chatDelete.hidden = true);
  }

  function dismissSecurityBanner() {
    state.dismissedBanner = true;
    localStorage.setItem('mm-chat-security-dismissed', '1');
    dom.chatBanner?.setAttribute('hidden', 'true');
  }

  function renderMessages(conversationId) {
    if (!dom.chatMessages) return;
    dom.chatMessages.classList.remove('is-loading');

    const messages = state.messagesByConversation.get(conversationId) || [];
    if (!messages.length) {
      dom.chatMessages.innerHTML =
        '<div class="chat-panel__empty">Commencez la discussion avec un premier message.</div>';
      return;
    }

    dom.chatMessages.innerHTML = '';
    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
      fragment.appendChild(createMessageElement(message));
    });
    dom.chatMessages.appendChild(fragment);
  }

  function createMessageElement(message) {
    const isMine = message.sender === state.userId;
    const row = document.createElement('div');
    row.className = 'message-row';
    row.dataset.messageId = message.id;
    if (message.clientTempId) {
      row.dataset.clientId = message.clientTempId;
    }
    if (isMine) {
      row.classList.add('message-row--own');
    }
    if (message.status === 'sending') {
      row.classList.add('message-row--pending');
    }

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    if (isMine) {
      avatar.innerHTML = '<span class="message-avatar__bubble">Moi</span>';
    } else if (state.activeParticipantAvatar) {
      avatar.innerHTML = `<span class="message-avatar__img" style="background-image:url('${encodeURI(
        state.activeParticipantAvatar
      )}')"></span>`;
    } else {
      avatar.innerHTML = '<span class="message-avatar__bubble">•</span>';
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (isMine) bubble.classList.add('message-bubble--own');

    const content = document.createElement('div');
    content.className = 'message-bubble__content';
    content.innerHTML = formatMessageText(message.text);
    bubble.appendChild(content);

    if (Array.isArray(message.attachments) && message.attachments.length) {
      const attachments = document.createElement('div');
      attachments.className = 'message-attachments';
      message.attachments.forEach((attachment) => {
        const item = document.createElement('a');
        item.className = 'message-attachment';
        const href = attachment.url || (attachment.key ? `/uploads/chat/${attachment.key}` : null);
        if (href) {
          item.href = href;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
        }
        if (attachment.thumbnailUrl || attachment.mime?.startsWith('image/')) {
          const thumb =
            attachment.thumbnailUrl ||
            attachment.url ||
            (attachment.key ? `/uploads/chat/${attachment.key}` : null);
          item.innerHTML = `<img src="${encodeURI(
            thumb || ''
          )}" alt="${escapeHtml(attachment.originalName || 'Pièce jointe')}">`;
        } else {
          item.textContent = attachment.originalName || 'Pièce jointe';
        }
        attachments.appendChild(item);
      });
      bubble.appendChild(attachments);
    }

    const meta = document.createElement('div');
    meta.className = 'message-bubble__meta';

    const time = document.createElement('time');
    time.className = 'message-bubble__time';
    time.dateTime = message.createdAt.toISOString();
    time.textContent = formatTime(message.createdAt);
    meta.appendChild(time);

    if (isMine) {
      const status = document.createElement('span');
      status.className = 'message-bubble__status';
      status.textContent = formatStatus(message.status);
      meta.appendChild(status);
    }

    bubble.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(bubble);

    return row;
  }

  function insertMessageIntoActive(message) {
    if (!dom.chatMessages) return;
    const existing = dom.chatMessages.querySelector(`[data-message-id="${message.id}"]`);
    if (existing) {
      updateMessageElement(existing, message);
      return;
    }
    if (message.clientTempId) {
      const pending = dom.chatMessages.querySelector(`[data-client-id="${message.clientTempId}"]`);
      if (pending) {
        pendingMessages.delete(message.clientTempId);
        updateMessageElement(pending, message);
        pending.dataset.messageId = message.id;
        delete pending.dataset.clientId;
        storeMessage(activeConversationId, message);
        return;
      }
    }
    storeMessage(activeConversationId, message);
    const row = createMessageElement(message);
    dom.chatMessages.appendChild(row);
    scrollMessagesToBottom({ smooth: message.sender === state.userId });
  }

  function storeMessage(conversationId, message) {
    if (!conversationId || !message) return;
    const list = state.messagesByConversation.get(conversationId) || [];
    const index = list.findIndex((item) => {
      if (item.id && message.id && item.id === message.id) return true;
      if (message.clientTempId && item.clientTempId && item.clientTempId === message.clientTempId) {
        return true;
      }
      return false;
    });
    if (index >= 0) {
      list[index] = message;
    } else {
      list.push(message);
    }
    list.sort((a, b) => a.createdAt - b.createdAt);
    state.messagesByConversation.set(conversationId, list);
  }

  function updateMessageElement(element, message) {
    element.classList.remove('message-row--pending');
    element.dataset.messageId = message.id;
    const bubble = element.querySelector('.message-bubble');
    if (!bubble) return;
    bubble.classList.toggle('message-bubble--own', message.sender === state.userId);

    const content = bubble.querySelector('.message-bubble__content');
    if (content) {
      content.innerHTML = formatMessageText(message.text);
    }

    const attachmentsWrapper = bubble.querySelector('.message-attachments');
    if (attachmentsWrapper) attachmentsWrapper.remove();
    if (Array.isArray(message.attachments) && message.attachments.length) {
      const wrapper = document.createElement('div');
      wrapper.className = 'message-attachments';
      message.attachments.forEach((attachment) => {
        const item = document.createElement('a');
        item.className = 'message-attachment';
        const href = attachment.url || (attachment.key ? `/uploads/chat/${attachment.key}` : null);
        if (href) {
          item.href = href;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
        }
        if (attachment.thumbnailUrl || attachment.mime?.startsWith('image/')) {
          const thumb =
            attachment.thumbnailUrl ||
            attachment.url ||
            (attachment.key ? `/uploads/chat/${attachment.key}` : null);
          item.innerHTML = `<img src="${encodeURI(
            thumb || ''
          )}" alt="${escapeHtml(attachment.originalName || 'Pièce jointe')}">`;
        } else {
          item.textContent = attachment.originalName || 'Pièce jointe';
        }
        wrapper.appendChild(item);
      });
      bubble.appendChild(wrapper);
    }

    const status = bubble.querySelector('.message-bubble__status');
    if (status && message.sender === state.userId) {
      status.textContent = formatStatus(message.status);
    }
    const time = bubble.querySelector('.message-bubble__time');
    if (time) {
      time.dateTime = message.createdAt.toISOString();
      time.textContent = formatTime(message.createdAt);
    }
  }

  function updateMessageStatus(messageId, status, at) {
    if (!dom.chatMessages) return;
    const element = dom.chatMessages.querySelector(`[data-message-id="${messageId}"]`);
    if (!element) return;
    const meta = element.querySelector('.message-bubble__status');
    if (meta) {
      meta.textContent = formatStatus(status);
    }
    if (at) {
      const timeElement = element.querySelector('.message-bubble__time');
      if (timeElement) {
        timeElement.dateTime = new Date(at).toISOString();
      }
    }
  }

  function updateConversationPreview(conversationId, message) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    conversation.lastMessage = {
      text: message.text,
      sender: message.sender,
      timestamp: message.createdAt
    };
    conversation.lastMessagePreview = message.text || '[Pièce jointe]';
    conversation.lastMessageAt = message.createdAt;
  }

  function markConversationAsRead(conversationId) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    if (conversation.unreadCount > 0) {
      const previous = conversation.unreadCount;
      conversation.unreadCount = 0;
      state.unreadTotal = Math.max(0, state.unreadTotal - previous);
      updateUnreadBadge();
      renderConversations();
    }
  }

  function incrementConversationUnread(conversationId) {
    const conversation = findConversation(conversationId);
    if (!conversation) return;
    conversation.unreadCount += 1;
    state.unreadTotal += 1;
    updateUnreadBadge();
    renderConversations();
  }

  function moveConversationToTop(conversationId) {
    const index = state.conversations.findIndex((c) => c.id === conversationId);
    if (index <= 0) return;
    const [conversation] = state.conversations.splice(index, 1);
    state.conversations.unshift(conversation);
  }

  function handleBackToList() {
    dom.messagesLayout?.classList.remove('messages-layout--detail');
    highlightSelectedConversation('');
    hideChatPanel();
    activeConversationId = null;
    state.activeParticipantAvatar = null;
  }

  async function handleHideConversation() {
    if (!activeConversationId || !dom.chatDelete) return;
    dom.chatDelete.disabled = true;
    try {
      await apiFetch(`/chat/conversations/${activeConversationId}/hide`, { method: 'POST' });
      state.conversations = state.conversations.filter((c) => c.id !== activeConversationId);
      state.filteredConversations = state.filteredConversations.filter(
        (c) => c.id !== activeConversationId
      );
      state.messagesByConversation.delete(activeConversationId);
      activeConversationId = null;
      state.activeParticipantAvatar = null;
      hideChatPanel();
      applySearch();
      updateUnreadBadge();
      if (typeof window.showToast === 'function') {
        window.showToast('Conversation supprimée de votre messagerie.');
      }
    } catch (error) {
      console.error('[chat] Impossible de masquer', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Suppression impossible, réessayez.');
      }
    } finally {
      dom.chatDelete.disabled = false;
    }
  }

  function handleTextareaInput() {
    if (!dom.chatTextarea || !dom.chatSend) return;
    const text = dom.chatTextarea.value || '';
    dom.chatSend.disabled = text.trim().length === 0;
    if (text.length >= dom.chatTextarea.maxLength) {
      dom.chatInputNote?.removeAttribute('hidden');
    } else {
      dom.chatInputNote?.setAttribute('hidden', 'true');
    }
    notifyTyping();
  }

  async function handleSendMessage() {
    if (!dom.chatTextarea || !activeConversationId) return;
    const text = dom.chatTextarea.value.trim();
    if (!text) return;
    dom.chatTextarea.value = '';
    dom.chatSend.disabled = true;

    const clientTempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const pending = {
      id: clientTempId,
      clientTempId,
      conversationId: activeConversationId,
      sender: state.userId,
      text,
      attachments: [],
      status: 'sending',
      createdAt: new Date()
    };
    storeMessage(activeConversationId, pending);
    const row = createMessageElement(pending);
    dom.chatMessages?.appendChild(row);
    pendingMessages.set(clientTempId, row);
    scrollMessagesToBottom({ smooth: true });

    try {
      const data = await apiFetch(`/chat/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        body: { text, attachments: [], clientTempId }
      });
      const savedMessage = data?.message ? enhanceMessage(data.message) : null;
      if (savedMessage) {
        insertMessageIntoActive(savedMessage);
        updateConversationPreview(activeConversationId, savedMessage);
        moveConversationToTop(activeConversationId);
        applySearch();
      }
    } catch (error) {
      console.error('[chat] Envoi impossible', error);
      const element = pendingMessages.get(clientTempId);
      if (element) {
        element.classList.add('message-row--error');
        const status = element.querySelector('.message-bubble__status');
        if (status) status.textContent = 'Échec';
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Message non envoyé.');
      }
    } finally {
      pendingMessages.delete(clientTempId);
    }
  }

  function joinConversation(conversationId, { markAsRead = false } = {}) {
    ensureSocket();
    socket?.emit('conversation:join', { conversationId, markAsRead });
  }

  function scheduleMarkRead(messageId) {
    if (!activeConversationId) return;
    pendingRead.add(messageId);
    if (readFlushTimer) return;
    readFlushTimer = window.setTimeout(flushMarkRead, 400);
  }

  function flushMarkRead() {
    if (!pendingRead.size || !activeConversationId) {
      readFlushTimer = null;
      return;
    }
    const ids = Array.from(pendingRead);
    pendingRead.clear();
    readFlushTimer = null;
    socket?.emit('messages:markRead', { conversationId: activeConversationId, messageIds: ids });
  }

  function notifyTyping() {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:start', { conversationId: activeConversationId });
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversationId });
    }, 2200);
  }

  function showTypingIndicator() {
    if (!dom.typingIndicator) return;
    dom.typingIndicator.removeAttribute('hidden');
  }

  function hideTypingIndicator() {
    if (!dom.typingIndicator) return;
    dom.typingIndicator.setAttribute('hidden', 'true');
  }

  function handleSearchInput(event) {
    state.searchTerm = event.target.value || '';
    applySearch();
  }

  function scrollMessagesToBottom({ smooth = true, force = false } = {}) {
    if (!dom.chatMessages) return;
    const alreadyBottom =
      dom.chatMessages.scrollHeight - dom.chatMessages.scrollTop - dom.chatMessages.clientHeight <
      60;
    if (!force && alreadyBottom) return;
    dom.chatMessages.scrollTo({
      top: dom.chatMessages.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function updateStatusIndicator(extra) {
    if (!dom.messagesStatus) return;
    dom.messagesStatus.dataset.connected = String(isConnected);
    if (dom.messagesStatusText) {
      dom.messagesStatusText.textContent = isConnected ? 'Connecté' : 'Déconnecté';
      if (extra) {
        dom.messagesStatusText.textContent += ` (${extra})`;
      }
    }
  }

  function updateUnreadBadge() {
    const total = state.conversations.reduce(
      (acc, conversation) => acc + (conversation.unreadCount || 0),
      0
    );
    if (dom.messagesUnreadBadge) {
      if (total > 0) {
        dom.messagesUnreadBadge.textContent = total > 99 ? '99+' : String(total);
        dom.messagesUnreadBadge.style.display = 'inline-flex';
      } else {
        dom.messagesUnreadBadge.textContent = '';
        dom.messagesUnreadBadge.style.display = 'none';
      }
    }
    const navMessages = document.getElementById('navMessages');
    if (navMessages) {
      if (total > 0) {
        navMessages.setAttribute('data-unread', 'true');
      } else {
        navMessages.removeAttribute('data-unread');
      }
    }
  }

  function formatMessageText(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    return escaped.replace(/\n/g, '<br>');
  }

  function formatStatus(status) {
    switch (status) {
      case 'read':
        return 'Lu';
      case 'delivered':
        return 'Reçu';
      case 'sending':
        return 'Envoi…';
      case 'sent':
      default:
        return 'Envoyé';
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatRelativeTime(date) {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.round(diff / (60 * 1000));
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.round(diff / (60 * 60 * 1000));
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    if (days <= 7) return `Il y a ${days} j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function handleConversationStartedEvent(event) {
    const detail = event?.detail;
    const rawConversation = detail?.conversation || detail;
    if (!rawConversation) {
      loadConversations({ force: true });
      return;
    }
    const conversation = enhanceConversation(rawConversation);
    upsertConversation(conversation);
    applySearch();
    updateUnreadBadge();

    const shouldOpen =
      dom.modal?.classList.contains('mm-open') || detail?.autoOpen || detail?.created;
    pendingSelectConversationId = conversation.id;
    if (shouldOpen) {
      openModal({ conversationId: conversation.id });
      selectConversationIfAvailable(conversation.id);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function apiFetch(path, { method = 'GET', body, headers, query } = {}) {
    const url = buildUrl(path, query);
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const requestHeaders = isFormData
      ? headers || {}
      : {
          'Content-Type': 'application/json',
          ...(headers || {})
        };
    const requestInit = {
      method,
      credentials: 'include',
      headers: requestHeaders
    };
    if (body) {
      requestInit.body = isFormData ? body : JSON.stringify(body);
    }
    const response = await fetch(url, requestInit);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || payload?.status === 'error') {
      const message = payload?.message || `Erreur HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = payload?.code;
      error.payload = payload;
      throw error;
    }
    return payload?.data ?? payload;
  }

  function buildUrl(path, query) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const segment = path.startsWith('/') ? path : `/${path}`;
    let url = `${base}${segment}`;
    if (query && typeof query === 'object') {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  window.ChatClient = {
    connect: ensureSocket,
    joinConversation,
    leaveConversation: (conversationId) => socket?.emit('conversation:leave', { conversationId }),
    sendMessage: ({ conversationId, text, attachments = [] }) =>
      apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { text, attachments }
      }),
    notifyTyping
  };
})();
