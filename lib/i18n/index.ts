/**
 * Elite Internationalization System with Ihsān Principles
 * 
 * Multi-language support featuring:
 * - Type-safe translations
 * - Lazy loading of locales
 * - Pluralization rules
 * - Date/number formatting
 * - RTL support
 * - Translation interpolation
 * - Namespace organization
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type Locale = string;
export type TranslationKey = string;
export type TranslationValue = string | PluralTranslation;

export interface PluralTranslation {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface TranslationDictionary {
  [key: string]: TranslationValue | TranslationDictionary;
}

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
  pluralRule: (n: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

export interface I18nOptions {
  defaultLocale: Locale;
  fallbackLocale?: Locale;
  supportedLocales: Locale[];
  loadPath?: string;
  interpolation?: {
    prefix?: string;
    suffix?: string;
  };
}

export type TranslationLoader = (locale: Locale, namespace?: string) => Promise<TranslationDictionary>;

// ============================================================================
// Default Locale Configurations
// ============================================================================

const localeConfigs: Record<string, LocaleConfig> = {
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousands: ',', currency: '$' },
    pluralRule: (n) => n === 1 ? 'one' : 'other'
  },
  'ar': {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '٫', thousands: '٬', currency: 'ر.س' },
    pluralRule: (n) => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n % 100 >= 3 && n % 100 <= 10) return 'few';
      if (n % 100 >= 11) return 'many';
      return 'other';
    }
  },
  'es': {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: '.', currency: '€' },
    pluralRule: (n) => n === 1 ? 'one' : 'other'
  },
  'fr': {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: ' ', currency: '€' },
    pluralRule: (n) => n <= 1 ? 'one' : 'other'
  },
  'de': {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: '.', currency: '€' },
    pluralRule: (n) => n === 1 ? 'one' : 'other'
  },
  'zh': {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousands: ',', currency: '¥' },
    pluralRule: () => 'other' // Chinese doesn't have plural forms
  },
  'ja': {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousands: ',', currency: '¥' },
    pluralRule: () => 'other'
  },
  'ko': {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousands: ',', currency: '₩' },
    pluralRule: () => 'other'
  }
};

// ============================================================================
// I18n Manager
// ============================================================================

export class I18nManager {
  private currentLocale: Locale;
  private fallbackLocale: Locale;
  private supportedLocales: Locale[];
  private translations: Map<Locale, Map<string, TranslationDictionary>> = new Map();
  private interpolationPrefix: string;
  private interpolationSuffix: string;
  private loader?: TranslationLoader;
  private changeHandlers: Set<(locale: Locale) => void> = new Set();
  
  constructor(options: I18nOptions) {
    this.currentLocale = options.defaultLocale;
    this.fallbackLocale = options.fallbackLocale || options.defaultLocale;
    this.supportedLocales = options.supportedLocales;
    this.interpolationPrefix = options.interpolation?.prefix || '{{';
    this.interpolationSuffix = options.interpolation?.suffix || '}}';
  }
  
  /**
   * Set translation loader
   */
  setLoader(loader: TranslationLoader): void {
    this.loader = loader;
  }
  
  /**
   * Load translations for a locale
   */
  async loadLocale(locale: Locale, namespace: string = 'common'): Promise<void> {
    if (!this.loader) {
      console.warn('[i18n] No loader configured');
      return;
    }
    
    try {
      const translations = await this.loader(locale, namespace);
      this.addTranslations(locale, namespace, translations);
    } catch (error) {
      console.error(`[i18n] Failed to load locale ${locale}/${namespace}:`, error);
    }
  }
  
  /**
   * Add translations manually
   */
  addTranslations(locale: Locale, namespace: string, translations: TranslationDictionary): void {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }
    this.translations.get(locale)!.set(namespace, translations);
  }
  
  /**
   * Get current locale
   */
  getLocale(): Locale {
    return this.currentLocale;
  }
  
  /**
   * Set current locale
   */
  async setLocale(locale: Locale): Promise<void> {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`[i18n] Locale ${locale} not supported, falling back to ${this.fallbackLocale}`);
      locale = this.fallbackLocale;
    }
    
    // Load locale if not already loaded
    if (!this.translations.has(locale)) {
      await this.loadLocale(locale);
    }
    
    this.currentLocale = locale;
    this.notifyChange(locale);
    
    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      const config = this.getLocaleConfig(locale);
      document.documentElement.dir = config.direction;
      document.documentElement.lang = locale;
    }
  }
  
  /**
   * Get locale configuration
   */
  getLocaleConfig(locale?: Locale): LocaleConfig {
    const l = locale || this.currentLocale;
    return localeConfigs[l] || localeConfigs['en'];
  }
  
  /**
   * Translate a key
   */
  t(key: TranslationKey, options?: Record<string, unknown>): string {
    return this.translate(key, options);
  }
  
  /**
   * Translate with full options
   */
  translate(
    key: TranslationKey,
    options?: {
      count?: number;
      defaultValue?: string;
      namespace?: string;
      locale?: Locale;
      [key: string]: unknown;
    }
  ): string {
    const locale = options?.locale || this.currentLocale;
    const namespace = options?.namespace || 'common';
    
    // Get translation value
    let value = this.getValue(locale, namespace, key);
    
    // Try fallback locale
    if (value === undefined && locale !== this.fallbackLocale) {
      value = this.getValue(this.fallbackLocale, namespace, key);
    }
    
    // Use default value or key
    if (value === undefined) {
      return options?.defaultValue || key;
    }
    
    // Handle pluralization
    if (typeof value === 'object' && options?.count !== undefined) {
      value = this.pluralize(value, options.count, locale);
    }
    
    // Handle interpolation
    if (typeof value === 'string' && options) {
      value = this.interpolate(value, options);
    }
    
    return value as string;
  }
  
  /**
   * Format a number according to locale
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }
  
  /**
   * Format currency
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency
    }).format(value);
  }
  
  /**
   * Format a date according to locale
   */
  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }
  
  /**
   * Format relative time
   */
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' }).format(value, unit);
  }
  
  /**
   * Check if locale is RTL
   */
  isRTL(locale?: Locale): boolean {
    return this.getLocaleConfig(locale).direction === 'rtl';
  }
  
  /**
   * Get supported locales
   */
  getSupportedLocales(): Locale[] {
    return [...this.supportedLocales];
  }
  
  /**
   * Subscribe to locale changes
   */
  onChange(handler: (locale: Locale) => void): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }
  
  /**
   * Detect user's preferred locale
   */
  detectLocale(): Locale {
    if (typeof window === 'undefined') {
      return this.currentLocale;
    }
    
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLocale = urlParams.get('locale') || urlParams.get('lang');
    if (urlLocale && this.supportedLocales.includes(urlLocale)) {
      return urlLocale;
    }
    
    // Check localStorage
    const storedLocale = localStorage.getItem('locale');
    if (storedLocale && this.supportedLocales.includes(storedLocale)) {
      return storedLocale;
    }
    
    // Check browser language
    const browserLocales = navigator.languages || [navigator.language];
    for (const locale of browserLocales) {
      const shortLocale = locale.split('-')[0];
      if (this.supportedLocales.includes(shortLocale)) {
        return shortLocale;
      }
    }
    
    return this.fallbackLocale;
  }
  
  /**
   * Persist locale preference
   */
  persistLocale(locale: Locale): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private getValue(locale: Locale, namespace: string, key: string): TranslationValue | undefined {
    const localeTranslations = this.translations.get(locale);
    if (!localeTranslations) return undefined;
    
    const namespaceTranslations = localeTranslations.get(namespace);
    if (!namespaceTranslations) return undefined;
    
    // Handle nested keys (e.g., "common.buttons.submit")
    const keys = key.split('.');
    let current: TranslationDictionary | TranslationValue = namespaceTranslations;
    
    for (const k of keys) {
      if (typeof current !== 'object' || current === null) return undefined;
      if (Array.isArray(current)) return undefined;
      
      // Check if current has the 'one' property (PluralTranslation)
      if ('one' in current && 'other' in current) {
        return current as TranslationValue;
      }
      
      current = (current as TranslationDictionary)[k];
      if (current === undefined) return undefined;
    }
    
    return current as TranslationValue;
  }
  
  private pluralize(translation: PluralTranslation, count: number, locale: Locale): string {
    const config = this.getLocaleConfig(locale);
    const form = config.pluralRule(count);
    
    // Try to get the specific form, fallback to 'other'
    return translation[form] || translation.other;
  }
  
  private interpolate(text: string, values: Record<string, unknown>): string {
    const { interpolationPrefix: prefix, interpolationSuffix: suffix } = this;
    
    return text.replace(
      new RegExp(`${this.escapeRegex(prefix)}\\s*(\\w+)\\s*${this.escapeRegex(suffix)}`, 'g'),
      (_, key) => {
        const value = values[key];
        return value !== undefined ? String(value) : `${prefix}${key}${suffix}`;
      }
    );
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private notifyChange(locale: Locale): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(locale);
      } catch (error) {
        console.error('[i18n] Change handler error:', error);
      }
    });
  }
}

// ============================================================================
// Translation Utilities
// ============================================================================

/**
 * Create a namespace-scoped translator
 */
export function createNamespacedT(i18n: I18nManager, namespace: string): (key: string, options?: Record<string, unknown>) => string {
  return (key, options) => i18n.translate(key, { ...options, namespace });
}

/**
 * Create translation extraction helper (for tooling)
 */
export function createTranslationKeys<T extends Record<string, string>>(keys: T): T {
  return keys;
}

/**
 * Merge translation dictionaries
 */
export function mergeTranslations(
  target: TranslationDictionary,
  source: TranslationDictionary
): TranslationDictionary {
  const result = { ...target };
  
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && !('one' in value && 'other' in value)) {
      result[key] = mergeTranslations(
        (result[key] as TranslationDictionary) || {},
        value as TranslationDictionary
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// ============================================================================
// React Integration Helpers
// ============================================================================

export interface UseTranslationResult {
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isRTL: boolean;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
}

/**
 * Create a translation hook factory
 */
export function createUseTranslation(i18n: I18nManager) {
  return function useTranslation(namespace?: string): UseTranslationResult {
    // Note: In actual React, this would use useState/useEffect
    // This is a simplified version for the module
    return {
      t: namespace 
        ? createNamespacedT(i18n, namespace)
        : (key, options) => i18n.t(key, options),
      locale: i18n.getLocale(),
      setLocale: (locale) => i18n.setLocale(locale),
      isRTL: i18n.isRTL(),
      formatNumber: (value, options) => i18n.formatNumber(value, options),
      formatDate: (date, options) => i18n.formatDate(date, options),
      formatCurrency: (value, currency) => i18n.formatCurrency(value, currency)
    };
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let i18nInstance: I18nManager | null = null;

export function getI18n(options?: I18nOptions): I18nManager {
  if (!i18nInstance && options) {
    i18nInstance = new I18nManager(options);
  }
  if (!i18nInstance) {
    throw new Error('I18n not initialized. Provide options on first call.');
  }
  return i18nInstance;
}

export function initI18n(options: I18nOptions): I18nManager {
  i18nInstance = new I18nManager(options);
  return i18nInstance;
}

// ============================================================================
// Default Translations (English)
// ============================================================================

export const defaultTranslations: TranslationDictionary = {
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    noResults: 'No results found',
    pageNotFound: 'Page not found',
    serverError: 'Server error',
    networkError: 'Network error',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden'
  },
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email',
    minLength: 'Must be at least {{min}} characters',
    maxLength: 'Must be no more than {{max}} characters',
    pattern: 'Invalid format',
    min: 'Must be at least {{min}}',
    max: 'Must be no more than {{max}}'
  },
  dates: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month'
  },
  items: {
    one: '{{count}} item',
    other: '{{count}} items'
  }
};

export default {
  I18nManager,
  getI18n,
  initI18n,
  createNamespacedT,
  createTranslationKeys,
  mergeTranslations,
  createUseTranslation,
  defaultTranslations,
  localeConfigs
};
