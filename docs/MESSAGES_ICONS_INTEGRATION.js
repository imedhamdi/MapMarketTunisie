/**
 * Guide d'intégration des nouvelles icônes SVG dans la messagerie
 * Style épuré et cohérent avec le design Vinted
 */

/* global document, window, closeMessagesModal */

// ============================================
// 1. Icônes SVG en tant que constantes
// ============================================

const ICONS = {
  close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  back: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,

  delete: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,

  attach: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>`,

  send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`,

  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>`,

  image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`,

  emptyMessages: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`
};

// ============================================
// 2. Modifications dans messages.js
// ============================================

/**
 * Exemple: Remplacer les emoji par des icônes SVG
 */

// AVANT (avec emoji)
/*
function createConversationCoverFallback() {
  return '<span class="conversation-item__cover-fallback" aria-hidden="true">📷</span>';
}
*/

// APRÈS (avec icône SVG)
function createConversationCoverFallback() {
  return `<span class="conversation-item__cover-fallback" aria-hidden="true">
    ${ICONS.image}
  </span>`;
}

// ============================================
// 3. Bouton de fermeture du modal
// ============================================

/*
// AVANT
const closeBtn = document.createElement('button');
closeBtn.className = 'messages-header__close';
closeBtn.innerHTML = '✕';

// APRÈS
const closeBtn = document.createElement('button');
closeBtn.className = 'messages-header__close';
closeBtn.setAttribute('aria-label', 'Fermer');
closeBtn.innerHTML = ICONS.close;
*/

// ============================================
// 4. Bouton retour dans le chat
// ============================================

/*
// AVANT
backBtn.innerHTML = '←';

// APRÈS
backBtn.innerHTML = ICONS.back;
backBtn.setAttribute('aria-label', 'Retour aux conversations');
*/

// ============================================
// 5. Bouton supprimer conversation
// ============================================

/*
// AVANT
deleteBtn.textContent = 'Supprimer';

// APRÈS
deleteBtn.innerHTML = ICONS.delete;
deleteBtn.setAttribute('aria-label', 'Supprimer la conversation');
*/

// ============================================
// 6. Bouton d'envoi
// ============================================

/*
// AVANT
sendBtn.textContent = 'Envoyer';

// APRÈS
sendBtn.innerHTML = `${ICONS.send} <span>Envoyer</span>`;
// Ou simplement l'icône sur mobile
const isMobile = window.innerWidth < 640;
sendBtn.innerHTML = isMobile ? ICONS.send : `${ICONS.send} <span>Envoyer</span>`;
*/

// ============================================
// 7. Bouton pièce jointe
// ============================================

/*
// AVANT
attachBtn.textContent = '📎';

// APRÈS
attachBtn.innerHTML = ICONS.attach;
attachBtn.setAttribute('aria-label', 'Ajouter une pièce jointe');
*/

// ============================================
// 8. État vide de la liste
// ============================================

/*
// AVANT
emptyState.innerHTML = `
  <span class="conversations-list__empty-icon">💬</span>
  <p class="conversations-list__empty-title">Aucune conversation</p>
  <p class="conversations-list__empty-text">Vos conversations apparaîtront ici</p>
`;

// APRÈS
emptyState.innerHTML = `
  <span class="conversations-list__empty-icon">${ICONS.emptyMessages}</span>
  <p class="conversations-list__empty-title">Aucune conversation</p>
  <p class="conversations-list__empty-text">Vos conversations apparaîtront ici</p>
`;
*/

// ============================================
// 9. CSS pour les icônes (à ajouter si nécessaire)
// ============================================

const iconStyles = `
<style>
  .messages-header__close svg,
  .chat-panel__back svg,
  .chat-panel__delete svg,
  .chat-panel__attach svg,
  .chat-panel__send svg {
    display: inline-block;
    vertical-align: middle;
  }

  .chat-panel__send span {
    margin-left: 6px;
  }

  @media (max-width: 640px) {
    .chat-panel__send span {
      display: none;
    }
  }
</style>
`;

// ============================================
// 10. Exemple complet: Création du header
// ============================================

function createMessagesHeader(unreadCount) {
  const header = document.createElement('div');
  header.className = 'messages-header';

  const row = document.createElement('div');
  row.className = 'messages-header__row';

  const title = document.createElement('h2');
  title.className = 'mm-title';
  title.innerHTML = 'Messages';

  if (unreadCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'messages-header__badge';
    badge.textContent = unreadCount;
    title.appendChild(badge);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'messages-header__close';
  closeBtn.setAttribute('aria-label', 'Fermer');
  closeBtn.innerHTML = ICONS.close;
  closeBtn.onclick = () => closeMessagesModal();

  row.appendChild(title);
  row.appendChild(closeBtn);
  header.appendChild(row);

  return header;
}

// ============================================
// 11. Exemple: Zone de saisie avec icônes
// ============================================

function createChatInput() {
  const inputContainer = document.createElement('div');
  inputContainer.className = 'chat-panel__input';

  const row = document.createElement('div');
  row.className = 'chat-panel__input-row';

  // Bouton pièce jointe
  const attachBtn = document.createElement('button');
  attachBtn.className = 'chat-panel__attach';
  attachBtn.setAttribute('aria-label', 'Ajouter une pièce jointe');
  attachBtn.innerHTML = ICONS.attach;

  // Zone de texte
  const textField = document.createElement('div');
  textField.className = 'chat-panel__input-field';

  const textarea = document.createElement('textarea');
  textarea.id = 'chatTextarea';
  textarea.placeholder = 'Écrivez votre message...';
  textarea.rows = 1;

  textField.appendChild(textarea);

  // Bouton d'envoi
  const sendBtn = document.createElement('button');
  sendBtn.className = 'chat-panel__send';
  sendBtn.setAttribute('aria-label', 'Envoyer le message');

  // Responsive: texte sur desktop, icône sur mobile
  const isMobile = window.innerWidth < 640;
  sendBtn.innerHTML = isMobile ? ICONS.send : `${ICONS.send} <span>Envoyer</span>`;

  row.appendChild(attachBtn);
  row.appendChild(textField);
  row.appendChild(sendBtn);

  inputContainer.appendChild(row);

  return inputContainer;
}

// ============================================
// 12. Export pour utilisation
// ============================================

export {
  ICONS,
  createConversationCoverFallback,
  createMessagesHeader,
  createChatInput,
  iconStyles
};

// ============================================
// 13. Notes d'implémentation
// ============================================

/**
 * AVANTAGES DES ICÔNES SVG:
 *
 * 1. Scalables - Parfaites sur tous les écrans
 * 2. Personnalisables - Couleur via CSS (stroke: currentColor)
 * 3. Accessibles - Meilleur support aria-label
 * 4. Performantes - Pas de chargement d'images externes
 * 5. Cohérentes - Style uniforme dans toute l'app
 *
 * CONSEILS:
 *
 * - Utiliser stroke="currentColor" pour hériter la couleur du parent
 * - Définir stroke-width="2" pour un trait cohérent
 * - Utiliser stroke-linecap="round" pour des bouts arrondis
 * - Toujours ajouter aria-label sur les boutons avec icônes uniquement
 * - Tester sur différentes tailles d'écran
 */

// ============================================
// 14. Fallback pour les anciennes versions
// ============================================

/**
 * Si vous voulez garder la compatibilité avec l'ancien code:
 */
const EMOJI_FALLBACK = {
  close: '✕',
  back: '←',
  delete: '🗑️',
  attach: '📎',
  send: '➤',
  search: '🔍',
  image: '📷',
  emptyMessages: '💬'
};

// Utiliser ICONS en priorité, EMOJI_FALLBACK si SVG non supporté
const isSVGSupported =
  typeof document !== 'undefined' &&
  document.implementation?.hasFeature?.('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');

export const DISPLAY_ICONS = isSVGSupported ? ICONS : EMOJI_FALLBACK;
