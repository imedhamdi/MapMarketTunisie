/**
 * Utilitaires d'accessibilité (A11y)
 * Améliore l'expérience pour tous les utilisateurs
 */

/**
 * Gestionnaire de focus pour la navigation clavier
 */
export class FocusManager {
  constructor() {
    this.focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
  }

  /**
   * Obtient tous les éléments focusables dans un conteneur
   * @param {HTMLElement} container - Conteneur
   * @returns {Array<HTMLElement>}
   */
  getFocusableElements(container = document) {
    return Array.from(container.querySelectorAll(this.focusableSelectors));
  }

  /**
   * Piège le focus dans un élément (pour les modales)
   * @param {HTMLElement} element - Élément à piéger
   */
  trapFocus(element) {
    const focusableElements = this.getFocusableElements(element);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    // Retourner une fonction pour nettoyer
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Focus le premier élément invalide dans un formulaire
   * @param {HTMLFormElement} form - Formulaire
   */
  focusFirstInvalid(form) {
    const invalid = form.querySelector(':invalid, [aria-invalid="true"]');
    if (invalid) {
      invalid.focus();
    }
  }
}

/**
 * Annonce un message aux lecteurs d'écran
 * @param {string} message - Message à annoncer
 * @param {string} politeness - Niveau de politesse ('polite' ou 'assertive')
 */
export function announceToScreenReader(message, politeness = 'polite') {
  const liveRegion = getLiveRegion(politeness);
  liveRegion.textContent = message;

  // Effacer après 1 seconde
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 1000);
}

/**
 * Obtient ou crée une région live ARIA
 * @param {string} politeness - Niveau de politesse
 * @returns {HTMLElement}
 */
function getLiveRegion(politeness) {
  const id = `aria-live-${politeness}`;
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
  }

  return region;
}

/**
 * Gère la navigation clavier pour les menus
 */
export class MenuNavigation {
  constructor(menuElement, options = {}) {
    this.menu = menuElement;
    this.items = Array.from(menuElement.querySelectorAll('[role="menuitem"]'));
    this.currentIndex = 0;
    this.options = {
      loop: true,
      closeOnEscape: true,
      ...options
    };

    this.init();
  }

  init() {
    this.menu.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        e.preventDefault();
        this.focusLast();
        break;
      case 'Escape':
        if (this.options.closeOnEscape && this.options.onClose) {
          e.preventDefault();
          this.options.onClose();
        }
        break;
    }
  }

  focusNext() {
    this.currentIndex++;
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = this.options.loop ? 0 : this.items.length - 1;
    }
    this.items[this.currentIndex].focus();
  }

  focusPrevious() {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.options.loop ? this.items.length - 1 : 0;
    }
    this.items[this.currentIndex].focus();
  }

  focusFirst() {
    this.currentIndex = 0;
    this.items[0].focus();
  }

  focusLast() {
    this.currentIndex = this.items.length - 1;
    this.items[this.currentIndex].focus();
  }
}

/**
 * Vérifie le contraste des couleurs (WCAG 2.1)
 * @param {string} foreground - Couleur de premier plan (hex)
 * @param {string} background - Couleur de fond (hex)
 * @returns {Object} - Résultats du contraste
 */
export function checkColorContrast(foreground, background) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  const fgLuminance = relativeLuminance(fg);
  const bgLuminance = relativeLuminance(bg);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: contrastRatio.toFixed(2),
    aa: contrastRatio >= 4.5, // WCAG AA
    aaa: contrastRatio >= 7, // WCAG AAA
    aaLarge: contrastRatio >= 3, // WCAG AA pour texte large
    aaaLarge: contrastRatio >= 4.5 // WCAG AAA pour texte large
  };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

function relativeLuminance(rgb) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Skip links pour la navigation
 */
export function initSkipLinks() {
  const skipLink = document.querySelector('[href="#main-content"]');
  if (skipLink) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.getElementById('main-content') || document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
        main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
      }
    });
  }
}

// Auto-initialisation
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initSkipLinks();

    // Ajouter les régions live ARIA
    ['polite', 'assertive'].forEach((politeness) => getLiveRegion(politeness));
  });
}

// Exporter les instances
export const focusManager = new FocusManager();
