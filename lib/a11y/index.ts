/**
 * Elite Accessibility (a11y) System with Ihsān Principles
 * 
 * Comprehensive accessibility utilities featuring:
 * - ARIA attribute management
 * - Focus management & trapping
 * - Screen reader announcements
 * - Keyboard navigation
 * - Reduced motion support
 * - Color contrast utilities
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string;
  returnFocusOnDeactivate?: boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  allowOutsideClick?: boolean | ((e: MouseEvent | TouchEvent) => boolean);
  preventScroll?: boolean;
}

export interface AnnouncerOptions {
  politeness?: 'polite' | 'assertive';
  clearOnAnnouncementStart?: boolean;
  timeout?: number;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  callback: (event: KeyboardEvent) => void;
  description?: string;
  disabled?: boolean;
}

export interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

export interface ColorContrastResult {
  ratio: number;
  aa: boolean;        // 4.5:1 for normal text
  aaLarge: boolean;   // 3:1 for large text
  aaa: boolean;       // 7:1 for normal text
  aaaLarge: boolean;  // 4.5:1 for large text
}

// ============================================================================
// ARIA Manager
// ============================================================================

export class AriaManager {
  /**
   * Set ARIA attributes on element
   */
  static set(
    element: HTMLElement,
    attributes: Record<string, string | boolean | number | undefined>
  ): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        element.removeAttribute(`aria-${key}`);
      } else if (typeof value === 'boolean') {
        element.setAttribute(`aria-${key}`, value.toString());
      } else {
        element.setAttribute(`aria-${key}`, String(value));
      }
    });
  }
  
  /**
   * Get ARIA attribute value
   */
  static get(element: HTMLElement, attribute: string): string | null {
    return element.getAttribute(`aria-${attribute}`);
  }
  
  /**
   * Remove ARIA attributes
   */
  static remove(element: HTMLElement, attributes: string[]): void {
    attributes.forEach(attr => {
      element.removeAttribute(`aria-${attr}`);
    });
  }
  
  /**
   * Toggle ARIA boolean attribute
   */
  static toggle(element: HTMLElement, attribute: string, force?: boolean): boolean {
    const current = element.getAttribute(`aria-${attribute}`) === 'true';
    const newValue = force !== undefined ? force : !current;
    element.setAttribute(`aria-${attribute}`, newValue.toString());
    return newValue;
  }
  
  /**
   * Set role
   */
  static setRole(element: HTMLElement, role: string): void {
    element.setAttribute('role', role);
  }
  
  /**
   * Setup aria-describedby
   */
  static describedBy(element: HTMLElement, ...ids: string[]): void {
    const filtered = ids.filter(Boolean);
    if (filtered.length) {
      element.setAttribute('aria-describedby', filtered.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }
  
  /**
   * Setup aria-labelledby
   */
  static labelledBy(element: HTMLElement, ...ids: string[]): void {
    const filtered = ids.filter(Boolean);
    if (filtered.length) {
      element.setAttribute('aria-labelledby', filtered.join(' '));
    } else {
      element.removeAttribute('aria-labelledby');
    }
  }
  
  /**
   * Setup aria-controls
   */
  static controls(element: HTMLElement, ...ids: string[]): void {
    const filtered = ids.filter(Boolean);
    if (filtered.length) {
      element.setAttribute('aria-controls', filtered.join(' '));
    } else {
      element.removeAttribute('aria-controls');
    }
  }
  
  /**
   * Make element a live region
   */
  static makeLiveRegion(
    element: HTMLElement,
    options: {
      politeness?: 'polite' | 'assertive' | 'off';
      atomic?: boolean;
      relevant?: string;
    } = {}
  ): void {
    element.setAttribute('aria-live', options.politeness ?? 'polite');
    
    if (options.atomic !== undefined) {
      element.setAttribute('aria-atomic', options.atomic.toString());
    }
    
    if (options.relevant) {
      element.setAttribute('aria-relevant', options.relevant);
    }
  }
}

// ============================================================================
// Focus Manager
// ============================================================================

export class FocusManager {
  private static focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'details > summary:first-of-type'
  ].join(',');
  
  /**
   * Get all focusable elements within container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(this.focusableSelectors)
    );
    
    return elements.filter(el => {
      // Check visibility
      if (el.offsetParent === null && el.style.position !== 'fixed') return false;
      
      // Check aria-hidden
      if (el.closest('[aria-hidden="true"]')) return false;
      
      // Check inert
      if (el.closest('[inert]')) return false;
      
      return true;
    });
  }
  
  /**
   * Get first focusable element
   */
  static getFirstFocusable(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    return elements[0] || null;
  }
  
  /**
   * Get last focusable element
   */
  static getLastFocusable(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    return elements[elements.length - 1] || null;
  }
  
  /**
   * Focus element with options
   */
  static focus(
    element: HTMLElement | string | null,
    options: { preventScroll?: boolean } = {}
  ): boolean {
    const el = typeof element === 'string'
      ? document.getElementById(element)
      : element;
    
    if (!el) return false;
    
    try {
      el.focus({ preventScroll: options.preventScroll });
      return document.activeElement === el;
    } catch {
      return false;
    }
  }
  
  /**
   * Save current focus for later restoration
   */
  static saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement | null;
  }
  
  /**
   * Restore previously saved focus
   */
  static restoreFocus(
    element: HTMLElement | null,
    options: { preventScroll?: boolean } = {}
  ): boolean {
    return this.focus(element, options);
  }
}

// ============================================================================
// Focus Trap
// ============================================================================

export class FocusTrap {
  private container: HTMLElement;
  private options: FocusTrapOptions;
  private previouslyFocused: HTMLElement | null = null;
  private active = false;
  
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleClick: (e: MouseEvent) => void;
  
  constructor(container: HTMLElement, options: FocusTrapOptions = {}) {
    this.container = container;
    this.options = {
      returnFocusOnDeactivate: true,
      escapeDeactivates: true,
      clickOutsideDeactivates: false,
      preventScroll: false,
      ...options
    };
    
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleClick = this.onClick.bind(this);
  }
  
  /**
   * Activate focus trap
   */
  activate(): this {
    if (this.active) return this;
    
    this.active = true;
    this.previouslyFocused = FocusManager.saveFocus();
    
    // Set initial focus
    this.setInitialFocus();
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    
    if (this.options.clickOutsideDeactivates) {
      document.addEventListener('click', this.handleClick);
    }
    
    return this;
  }
  
  /**
   * Deactivate focus trap
   */
  deactivate(): this {
    if (!this.active) return this;
    
    this.active = false;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClick);
    
    // Return focus
    if (this.options.returnFocusOnDeactivate && this.previouslyFocused) {
      FocusManager.restoreFocus(this.previouslyFocused, {
        preventScroll: this.options.preventScroll
      });
    }
    
    return this;
  }
  
  /**
   * Check if trap is active
   */
  get isActive(): boolean {
    return this.active;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private setInitialFocus(): void {
    let elementToFocus: HTMLElement | null = null;
    
    if (this.options.initialFocus) {
      elementToFocus = typeof this.options.initialFocus === 'string'
        ? document.getElementById(this.options.initialFocus)
        : this.options.initialFocus;
    }
    
    if (!elementToFocus) {
      // Find element with autofocus
      elementToFocus = this.container.querySelector<HTMLElement>('[autofocus]');
    }
    
    if (!elementToFocus) {
      // Get first focusable element
      elementToFocus = FocusManager.getFirstFocusable(this.container);
    }
    
    if (!elementToFocus) {
      // Focus container itself
      this.container.setAttribute('tabindex', '-1');
      elementToFocus = this.container;
    }
    
    FocusManager.focus(elementToFocus, {
      preventScroll: this.options.preventScroll
    });
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.active) return;
    
    // Handle Escape
    if (event.key === 'Escape' && this.options.escapeDeactivates) {
      event.preventDefault();
      this.deactivate();
      return;
    }
    
    // Handle Tab
    if (event.key === 'Tab') {
      this.trapTabKey(event);
    }
  }
  
  private trapTabKey(event: KeyboardEvent): void {
    const focusableElements = FocusManager.getFocusableElements(this.container);
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;
    
    if (event.shiftKey) {
      // Shift+Tab: wrap from first to last
      if (activeElement === firstElement) {
        event.preventDefault();
        FocusManager.focus(lastElement);
      }
    } else {
      // Tab: wrap from last to first
      if (activeElement === lastElement) {
        event.preventDefault();
        FocusManager.focus(firstElement);
      }
    }
  }
  
  private onClick(event: MouseEvent): void {
    if (!this.active) return;
    
    const target = event.target as HTMLElement;
    
    if (!this.container.contains(target)) {
      if (typeof this.options.allowOutsideClick === 'function') {
        if (!this.options.allowOutsideClick(event)) {
          event.preventDefault();
        }
      } else if (!this.options.allowOutsideClick) {
        event.preventDefault();
      }
      
      if (this.options.clickOutsideDeactivates) {
        this.deactivate();
      }
    }
  }
}

// ============================================================================
// Screen Reader Announcer
// ============================================================================

export class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private timeout: number;
  
  constructor(timeout: number = 1000) {
    this.timeout = timeout;
    this.createRegions();
  }
  
  /**
   * Announce message to screen readers
   */
  announce(message: string, options: AnnouncerOptions = {}): void {
    const {
      politeness = 'polite',
      clearOnAnnouncementStart = true,
      timeout = this.timeout
    } = options;
    
    const region = politeness === 'assertive'
      ? this.assertiveRegion
      : this.politeRegion;
    
    if (!region) return;
    
    if (clearOnAnnouncementStart) {
      region.textContent = '';
    }
    
    // Use setTimeout to ensure the content change is detected
    setTimeout(() => {
      region.textContent = message;
      
      // Clear after timeout
      setTimeout(() => {
        region.textContent = '';
      }, timeout);
    }, 50);
  }
  
  /**
   * Announce politely (queue)
   */
  announcePolite(message: string): void {
    this.announce(message, { politeness: 'polite' });
  }
  
  /**
   * Announce assertively (interrupt)
   */
  announceAssertive(message: string): void {
    this.announce(message, { politeness: 'assertive' });
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.politeRegion?.remove();
    this.assertiveRegion?.remove();
    this.politeRegion = null;
    this.assertiveRegion = null;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private createRegions(): void {
    if (typeof document === 'undefined') return;
    
    this.politeRegion = this.createRegion('polite');
    this.assertiveRegion = this.createRegion('assertive');
    
    document.body.appendChild(this.politeRegion);
    document.body.appendChild(this.assertiveRegion);
  }
  
  private createRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    
    // Visually hidden but accessible
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
    
    return region;
  }
}

// ============================================================================
// Keyboard Navigation Manager
// ============================================================================

export class KeyboardNavigationManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;
  private handleKeyDown: (e: KeyboardEvent) => void;
  
  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
    
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }
  
  /**
   * Register keyboard shortcut
   */
  register(id: string, shortcut: KeyboardShortcut): () => void {
    this.shortcuts.set(id, shortcut);
    return () => this.unregister(id);
  }
  
  /**
   * Unregister keyboard shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }
  
  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Array<{ id: string } & KeyboardShortcut> {
    return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
      id,
      ...shortcut
    }));
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
    this.shortcuts.clear();
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') return;
    }
    
    for (const [, shortcut] of this.shortcuts) {
      if (shortcut.disabled) continue;
      
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.callback(event);
        return;
      }
    }
  }
  
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const { key, modifiers = {} } = shortcut;
    
    // Check key (case-insensitive for letters)
    if (event.key.toLowerCase() !== key.toLowerCase()) return false;
    
    // Check modifiers
    if (!!modifiers.ctrl !== event.ctrlKey) return false;
    if (!!modifiers.alt !== event.altKey) return false;
    if (!!modifiers.shift !== event.shiftKey) return false;
    if (!!modifiers.meta !== event.metaKey) return false;
    
    return true;
  }
}

// ============================================================================
// Skip Links
// ============================================================================

export class SkipLinksManager {
  private links: SkipLink[] = [];
  private container: HTMLElement | null = null;
  
  /**
   * Initialize skip links
   */
  initialize(links: SkipLink[]): void {
    this.links = links;
    this.createContainer();
    this.renderLinks();
  }
  
  /**
   * Add skip link
   */
  addLink(link: SkipLink): void {
    this.links.push(link);
    this.renderLinks();
  }
  
  /**
   * Remove skip link
   */
  removeLink(id: string): void {
    this.links = this.links.filter(l => l.id !== id);
    this.renderLinks();
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.links = [];
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private createContainer(): void {
    if (typeof document === 'undefined') return;
    
    this.container = document.createElement('nav');
    this.container.setAttribute('aria-label', 'Skip links');
    
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '9999',
      display: 'flex',
      justifyContent: 'center',
      padding: '8px',
      transform: 'translateY(-100%)',
      transition: 'transform 0.2s ease-in-out'
    });
    
    // Show on focus within
    this.container.addEventListener('focusin', () => {
      if (this.container) {
        this.container.style.transform = 'translateY(0)';
      }
    });
    
    this.container.addEventListener('focusout', (e) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (this.container && !this.container.contains(relatedTarget)) {
        this.container.style.transform = 'translateY(-100%)';
      }
    });
    
    document.body.insertBefore(this.container, document.body.firstChild);
  }
  
  private renderLinks(): void {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    
    this.links.forEach(link => {
      const anchor = document.createElement('a');
      anchor.href = `#${link.targetId}`;
      anchor.textContent = link.label;
      anchor.id = link.id;
      
      Object.assign(anchor.style, {
        padding: '8px 16px',
        backgroundColor: '#000',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        margin: '0 4px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px'
      });
      
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.targetId);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      this.container!.appendChild(anchor);
    });
  }
}

// ============================================================================
// Reduced Motion Utilities
// ============================================================================

export class ReducedMotion {
  private static mediaQuery: MediaQueryList | null = null;
  private static listeners: Set<(prefersReducedMotion: boolean) => void> = new Set();
  
  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  /**
   * Subscribe to reduced motion changes
   */
  static subscribe(callback: (prefersReducedMotion: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    
    if (!this.mediaQuery) {
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mediaQuery.addEventListener('change', () => {
        const prefers = this.prefersReducedMotion();
        this.listeners.forEach(listener => listener(prefers));
      });
    }
    
    this.listeners.add(callback);
    
    // Call immediately with current value
    callback(this.prefersReducedMotion());
    
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Get animation duration (0 if reduced motion preferred)
   */
  static getDuration(normalDuration: number): number {
    return this.prefersReducedMotion() ? 0 : normalDuration;
  }
  
  /**
   * Get transition style
   */
  static getTransition(property: string, duration: number, easing = 'ease'): string {
    if (this.prefersReducedMotion()) {
      return 'none';
    }
    return `${property} ${duration}ms ${easing}`;
  }
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

export class ColorContrast {
  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  /**
   * Check WCAG compliance
   */
  static checkCompliance(
    foreground: string,
    background: string
  ): ColorContrastResult {
    const ratio = this.getContrastRatio(foreground, background);
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaa: ratio >= 7,
      aaaLarge: ratio >= 4.5
    };
  }
  
  /**
   * Suggest compliant color
   */
  static suggestCompliantColor(
    backgroundColor: string,
    targetRatio: number = 4.5
  ): string {
    const bgLum = this.getLuminance(backgroundColor);
    
    // Try white first
    const whiteRatio = (1 + 0.05) / (bgLum + 0.05);
    if (whiteRatio >= targetRatio) return '#ffffff';
    
    // Try black
    const blackRatio = (bgLum + 0.05) / (0 + 0.05);
    if (blackRatio >= targetRatio) return '#000000';
    
    // Return the better option
    return whiteRatio > blackRatio ? '#ffffff' : '#000000';
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private static getLuminance(color: string): number {
    const rgb = this.parseColor(color);
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      const sRGB = c / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  private static parseColor(color: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    
    // Handle rgb/rgba
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    
    // Default to black
    return { r: 0, g: 0, b: 0 };
  }
}

// ============================================================================
// Roving Tabindex
// ============================================================================

export class RovingTabindex {
  private container: HTMLElement;
  private selector: string;
  private currentIndex = 0;
  private orientation: 'horizontal' | 'vertical' | 'both';
  private loop: boolean;
  
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleFocus: (e: FocusEvent) => void;
  
  constructor(
    container: HTMLElement,
    selector: string,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      loop?: boolean;
      initialIndex?: number;
    } = {}
  ) {
    this.container = container;
    this.selector = selector;
    this.orientation = options.orientation ?? 'horizontal';
    this.loop = options.loop ?? true;
    this.currentIndex = options.initialIndex ?? 0;
    
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleFocus = this.onFocus.bind(this);
    
    this.initialize();
  }
  
  /**
   * Get current focused index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  /**
   * Focus item at index
   */
  focusItem(index: number): void {
    const items = this.getItems();
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    
    this.updateTabindex(clampedIndex);
    items[clampedIndex]?.focus();
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.container.removeEventListener('focusin', this.handleFocus);
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private initialize(): void {
    this.updateTabindex(this.currentIndex);
    
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.container.addEventListener('focusin', this.handleFocus);
  }
  
  private getItems(): HTMLElement[] {
    return Array.from(this.container.querySelectorAll<HTMLElement>(this.selector));
  }
  
  private updateTabindex(newIndex: number): void {
    const items = this.getItems();
    
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === newIndex ? '0' : '-1');
    });
    
    this.currentIndex = newIndex;
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    const items = this.getItems();
    if (items.length === 0) return;
    
    let newIndex = this.currentIndex;
    let handled = false;
    
    const isHorizontal = this.orientation === 'horizontal' || this.orientation === 'both';
    const isVertical = this.orientation === 'vertical' || this.orientation === 'both';
    
    switch (event.key) {
      case 'ArrowRight':
        if (isHorizontal) {
          newIndex = this.getNextIndex(items.length, 1);
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          newIndex = this.getNextIndex(items.length, -1);
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          newIndex = this.getNextIndex(items.length, 1);
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          newIndex = this.getNextIndex(items.length, -1);
          handled = true;
        }
        break;
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      case 'End':
        newIndex = items.length - 1;
        handled = true;
        break;
    }
    
    if (handled) {
      event.preventDefault();
      this.focusItem(newIndex);
    }
  }
  
  private getNextIndex(length: number, direction: 1 | -1): number {
    let newIndex = this.currentIndex + direction;
    
    if (this.loop) {
      if (newIndex < 0) newIndex = length - 1;
      if (newIndex >= length) newIndex = 0;
    } else {
      newIndex = Math.max(0, Math.min(newIndex, length - 1));
    }
    
    return newIndex;
  }
  
  private onFocus(event: FocusEvent): void {
    const items = this.getItems();
    const target = event.target as HTMLElement;
    const index = items.indexOf(target);
    
    if (index !== -1 && index !== this.currentIndex) {
      this.updateTabindex(index);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let announcerInstance: ScreenReaderAnnouncer | null = null;

export function getAnnouncer(): ScreenReaderAnnouncer {
  if (!announcerInstance) {
    announcerInstance = new ScreenReaderAnnouncer();
  }
  return announcerInstance;
}

export function announce(message: string, options?: AnnouncerOptions): void {
  getAnnouncer().announce(message, options);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  AriaManager,
  FocusManager,
  FocusTrap,
  ScreenReaderAnnouncer,
  KeyboardNavigationManager,
  SkipLinksManager,
  ReducedMotion,
  ColorContrast,
  RovingTabindex,
  getAnnouncer,
  announce
};
