/**
 * Elite Security Utilities with Ihsān Principles
 * 
 * Comprehensive security toolkit featuring:
 * - XSS prevention
 * - Content Security Policy (CSP)
 * - Input sanitization
 * - Secure storage (encrypted)
 * - CSRF protection
 * - Rate limiting
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: string[];
}

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'report-uri'?: string;
  'report-to'?: string;
}

export interface SecureStorageOptions {
  encryption?: boolean;
  expiry?: number;
  namespace?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ============================================================================
// XSS Prevention
// ============================================================================

export class XSSPrevention {
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  private static readonly DANGEROUS_PATTERNS: RegExp[] = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:/gi,
    /vbscript:/gi,
    /expression\s*\(/gi
  ];
  
  /**
   * Escape HTML entities
   */
  static escapeHtml(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str.replace(/[&<>"'`=/]/g, char => this.HTML_ENTITIES[char] || char);
  }
  
  /**
   * Unescape HTML entities
   */
  static unescapeHtml(str: string): string {
    if (typeof str !== 'string') return '';
    
    const element = document.createElement('div');
    element.innerHTML = str;
    return element.textContent || '';
  }
  
  /**
   * Escape for attribute context
   */
  static escapeAttribute(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  /**
   * Escape for JavaScript context
   */
  static escapeJs(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/<\//g, '<\\/');
  }
  
  /**
   * Escape for URL context
   */
  static escapeUrl(str: string): string {
    if (typeof str !== 'string') return '';
    
    return encodeURIComponent(str);
  }
  
  /**
   * Escape for CSS context
   */
  static escapeCss(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str.replace(/[^\w-]/g, char => `\\${char.charCodeAt(0).toString(16)} `);
  }
  
  /**
   * Strip dangerous patterns
   */
  static stripDangerous(str: string): string {
    if (typeof str !== 'string') return '';
    
    let result = str;
    
    for (const pattern of this.DANGEROUS_PATTERNS) {
      result = result.replace(pattern, '');
    }
    
    return result;
  }
  
  /**
   * Validate URL (prevent javascript: etc)
   */
  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return '';
    
    const trimmed = url.trim().toLowerCase();
    
    // Block dangerous protocols
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('data:text/html')
    ) {
      return 'about:blank';
    }
    
    // Allow safe protocols
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('#')
    ) {
      return url;
    }
    
    // Prepend https:// if no protocol
    if (!trimmed.includes(':')) {
      return url;
    }
    
    return 'about:blank';
  }
}

// ============================================================================
// HTML Sanitizer
// ============================================================================

export class HTMLSanitizer {
  private static readonly DEFAULT_ALLOWED_TAGS = [
    'a', 'abbr', 'acronym', 'address', 'article', 'aside', 'b', 'blockquote',
    'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details',
    'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1',
    'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins', 'kbd',
    'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby',
    's', 'samp', 'section', 'small', 'span', 'strike', 'strong', 'sub',
    'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time',
    'tr', 'u', 'ul', 'var', 'wbr'
  ];
  
  private static readonly DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan', 'scope'],
    '*': ['class', 'id', 'aria-label', 'aria-describedby', 'role', 'tabindex']
  };
  
  private static readonly ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];
  
  /**
   * Sanitize HTML string
   */
  static sanitize(html: string, options: SanitizeOptions = {}): string {
    if (typeof html !== 'string') return '';
    
    const allowedTags = options.allowedTags || this.DEFAULT_ALLOWED_TAGS;
    const allowedAttributes = options.allowedAttributes || this.DEFAULT_ALLOWED_ATTRIBUTES;
    const allowedSchemes = options.allowedSchemes || this.ALLOWED_SCHEMES;
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    
    // Process all elements
    this.processNode(container, allowedTags, allowedAttributes, allowedSchemes);
    
    return container.innerHTML;
  }
  
  /**
   * Strip all HTML tags
   */
  static stripTags(html: string): string {
    if (typeof html !== 'string') return '';
    
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.textContent || '';
  }
  
  private static processNode(
    node: Element,
    allowedTags: string[],
    allowedAttributes: Record<string, string[]>,
    allowedSchemes: string[]
  ): void {
    const children = Array.from(node.children);
    
    for (const child of children) {
      const tagName = child.tagName.toLowerCase();
      
      // Remove disallowed tags
      if (!allowedTags.includes(tagName)) {
        if (child.textContent) {
          const text = document.createTextNode(child.textContent);
          child.replaceWith(text);
        } else {
          child.remove();
        }
        continue;
      }
      
      // Process attributes
      const attrs = Array.from(child.attributes);
      const tagAllowed = allowedAttributes[tagName] || [];
      const globalAllowed = allowedAttributes['*'] || [];
      
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        
        // Remove disallowed attributes
        if (!tagAllowed.includes(attrName) && !globalAllowed.includes(attrName)) {
          child.removeAttribute(attr.name);
          continue;
        }
        
        // Sanitize URL attributes
        if (['href', 'src', 'action'].includes(attrName)) {
          const value = attr.value.trim().toLowerCase();
          const scheme = value.split(':')[0];
          
          if (scheme && !allowedSchemes.includes(scheme) && !value.startsWith('/') && !value.startsWith('#')) {
            child.removeAttribute(attr.name);
          }
        }
        
        // Remove event handlers
        if (attrName.startsWith('on')) {
          child.removeAttribute(attr.name);
        }
      }
      
      // Recursively process children
      if (child.children.length > 0) {
        this.processNode(child, allowedTags, allowedAttributes, allowedSchemes);
      }
    }
  }
}

// ============================================================================
// Content Security Policy Builder
// ============================================================================

export class CSPBuilder {
  private directives: CSPDirectives = {};
  
  /**
   * Set default-src
   */
  defaultSrc(...sources: string[]): this {
    this.directives['default-src'] = sources;
    return this;
  }
  
  /**
   * Set script-src
   */
  scriptSrc(...sources: string[]): this {
    this.directives['script-src'] = sources;
    return this;
  }
  
  /**
   * Set style-src
   */
  styleSrc(...sources: string[]): this {
    this.directives['style-src'] = sources;
    return this;
  }
  
  /**
   * Set img-src
   */
  imgSrc(...sources: string[]): this {
    this.directives['img-src'] = sources;
    return this;
  }
  
  /**
   * Set font-src
   */
  fontSrc(...sources: string[]): this {
    this.directives['font-src'] = sources;
    return this;
  }
  
  /**
   * Set connect-src
   */
  connectSrc(...sources: string[]): this {
    this.directives['connect-src'] = sources;
    return this;
  }
  
  /**
   * Set frame-src
   */
  frameSrc(...sources: string[]): this {
    this.directives['frame-src'] = sources;
    return this;
  }
  
  /**
   * Set frame-ancestors
   */
  frameAncestors(...sources: string[]): this {
    this.directives['frame-ancestors'] = sources;
    return this;
  }
  
  /**
   * Set base-uri
   */
  baseUri(...sources: string[]): this {
    this.directives['base-uri'] = sources;
    return this;
  }
  
  /**
   * Set form-action
   */
  formAction(...sources: string[]): this {
    this.directives['form-action'] = sources;
    return this;
  }
  
  /**
   * Enable upgrade-insecure-requests
   */
  upgradeInsecureRequests(): this {
    this.directives['upgrade-insecure-requests'] = true;
    return this;
  }
  
  /**
   * Enable block-all-mixed-content
   */
  blockMixedContent(): this {
    this.directives['block-all-mixed-content'] = true;
    return this;
  }
  
  /**
   * Set report-uri
   */
  reportUri(uri: string): this {
    this.directives['report-uri'] = uri;
    return this;
  }
  
  /**
   * Build CSP header string
   */
  build(): string {
    const parts: string[] = [];
    
    for (const [directive, value] of Object.entries(this.directives)) {
      if (value === true) {
        parts.push(directive);
      } else if (typeof value === 'string') {
        parts.push(`${directive} ${value}`);
      } else if (Array.isArray(value)) {
        parts.push(`${directive} ${value.join(' ')}`);
      }
    }
    
    return parts.join('; ');
  }
  
  /**
   * Get meta tag HTML
   */
  toMetaTag(): string {
    return `<meta http-equiv="Content-Security-Policy" content="${this.build()}">`;
  }
  
  /**
   * Create default secure CSP
   */
  static secure(): CSPBuilder {
    return new CSPBuilder()
      .defaultSrc("'self'")
      .scriptSrc("'self'")
      .styleSrc("'self'", "'unsafe-inline'")
      .imgSrc("'self'", 'data:', 'https:')
      .fontSrc("'self'")
      .connectSrc("'self'")
      .frameAncestors("'none'")
      .baseUri("'self'")
      .formAction("'self'")
      .upgradeInsecureRequests();
  }
}

// ============================================================================
// Secure Storage
// ============================================================================

export class SecureStorage {
  private namespace: string;
  private encryptionKey: CryptoKey | null = null;
  
  constructor(options: SecureStorageOptions = {}) {
    this.namespace = options.namespace || 'secure';
  }
  
  /**
   * Initialize encryption key
   */
  async initEncryption(password: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Generate salt (in production, store this securely)
    const salt = encoder.encode(this.namespace + '_salt');
    
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Set item with optional encryption
   */
  async setItem<T>(
    key: string,
    value: T,
    options: { encrypt?: boolean; expiry?: number } = {}
  ): Promise<void> {
    const fullKey = `${this.namespace}:${key}`;
    
    const data = {
      value,
      timestamp: Date.now(),
      expiry: options.expiry ? Date.now() + options.expiry : null
    };
    
    let serialized = JSON.stringify(data);
    
    if (options.encrypt && this.encryptionKey) {
      serialized = await this.encrypt(serialized);
    }
    
    localStorage.setItem(fullKey, serialized);
  }
  
  /**
   * Get item with optional decryption
   */
  async getItem<T>(
    key: string,
    options: { decrypt?: boolean } = {}
  ): Promise<T | null> {
    const fullKey = `${this.namespace}:${key}`;
    
    let serialized = localStorage.getItem(fullKey);
    if (!serialized) return null;
    
    try {
      if (options.decrypt && this.encryptionKey) {
        serialized = await this.decrypt(serialized);
      }
      
      const data = JSON.parse(serialized) as {
        value: T;
        timestamp: number;
        expiry: number | null;
      };
      
      // Check expiry
      if (data.expiry && Date.now() > data.expiry) {
        this.removeItem(key);
        return null;
      }
      
      return data.value;
    } catch {
      return null;
    }
  }
  
  /**
   * Remove item
   */
  removeItem(key: string): void {
    const fullKey = `${this.namespace}:${key}`;
    localStorage.removeItem(fullKey);
  }
  
  /**
   * Clear all items in namespace
   */
  clear(): void {
    const prefix = `${this.namespace}:`;
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keys.forEach(k => localStorage.removeItem(k));
  }
  
  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    const fullKey = `${this.namespace}:${key}`;
    return localStorage.getItem(fullKey) !== null;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoder.encode(data)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private async decrypt(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  }
}

// ============================================================================
// CSRF Protection
// ============================================================================

export class CSRFProtection {
  private tokenKey: string;
  
  constructor(tokenKey: string = 'csrf_token') {
    this.tokenKey = tokenKey;
  }
  
  /**
   * Generate CSRF token
   */
  generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Store in session storage
    sessionStorage.setItem(this.tokenKey, token);
    
    return token;
  }
  
  /**
   * Get current token
   */
  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }
  
  /**
   * Validate token
   */
  validateToken(token: string): boolean {
    const storedToken = this.getToken();
    
    if (!storedToken || !token) return false;
    
    // Constant-time comparison
    return this.constantTimeCompare(storedToken, token);
  }
  
  /**
   * Regenerate token
   */
  regenerateToken(): string {
    sessionStorage.removeItem(this.tokenKey);
    return this.generateToken();
  }
  
  /**
   * Add token to request headers
   */
  getHeaders(): Record<string, string> {
    const token = this.getToken();
    
    return token ? { 'X-CSRF-Token': token } : {};
  }
  
  /**
   * Create hidden input for forms
   */
  createInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = this.tokenKey;
    input.value = this.getToken() || this.generateToken();
    return input;
  }
  
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

// ============================================================================
// Rate Limiter (Client-side)
// ============================================================================

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (id) => id,
      ...config
    };
  }
  
  /**
   * Check if request is allowed
   */
  check(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator!(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests
    let requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    const remaining = Math.max(0, this.config.maxRequests - requests.length);
    const resetAt = requests.length > 0
      ? requests[0] + this.config.windowMs
      : now + this.config.windowMs;
    
    if (requests.length >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now
      };
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
    
    return {
      allowed: true,
      remaining: remaining - 1,
      resetAt
    };
  }
  
  /**
   * Reset limiter for identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator!(identifier);
    this.requests.delete(key);
  }
  
  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// Input Validation
// ============================================================================

export class InputValidator {
  /**
   * Validate email
   */
  static isEmail(value: string): boolean {
    const pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return pattern.test(value);
  }
  
  /**
   * Validate URL
   */
  static isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate phone number
   */
  static isPhone(value: string): boolean {
    const pattern = /^\+?[1-9]\d{1,14}$/;
    return pattern.test(value.replace(/[\s\-()]/g, ''));
  }
  
  /**
   * Validate alphanumeric
   */
  static isAlphanumeric(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value);
  }
  
  /**
   * Validate UUID
   */
  static isUuid(value: string): boolean {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(value);
  }
  
  /**
   * Validate JSON
   */
  static isJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate credit card (Luhn algorithm)
   */
  static isCreditCard(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Check for SQL injection patterns
   */
  static hasSqlInjection(value: string): boolean {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|#|\/\*)/,
      /(\b(EXEC|EXECUTE|SP_|XP_)\b)/i
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
  
  /**
   * Check for XSS patterns
   */
  static hasXssPatterns(value: string): boolean {
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  XSSPrevention,
  HTMLSanitizer,
  CSPBuilder,
  SecureStorage,
  CSRFProtection,
  RateLimiter,
  InputValidator
};
