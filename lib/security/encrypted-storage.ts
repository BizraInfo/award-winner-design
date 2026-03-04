// lib/security/encrypted-storage.ts
/**
 * Encrypted Storage Module
 * 
 * Provides end-to-end encryption for local storage data
 * addressing Gap 6: State Persistence Encryption (Risk 6.8/10)
 * 
 * Features:
 * - AES-GCM 256-bit encryption
 * - Secure key derivation from user credentials
 * - Automatic IV generation per operation
 * - JSON serialization with type safety
 */

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Generate cryptographically secure random bytes
 */
function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-GCM
 */
async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate random IV
  const iv = getRandomBytes(IV_LENGTH);
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    dataBuffer
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer)
  };
}

/**
 * Decrypt data with AES-GCM
 */
async function decryptData(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv) as ArrayBuffer);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBuffer as unknown as BufferSource },
    key,
    ciphertextBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypted storage entry format
 */
interface EncryptedEntry {
  v: number;           // Version
  s: string;           // Salt (base64)
  iv: string;          // IV (base64)
  ct: string;          // Ciphertext (base64)
  ts: number;          // Timestamp
}

/**
 * Storage encryption manager
 */
export class EncryptedStorage {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private readonly prefix: string;
  
  constructor(prefix: string = 'bizra_enc_') {
    this.prefix = prefix;
  }
  
  /**
   * Initialize encryption with user password
   * Should be called after user authentication
   */
  async initialize(password: string): Promise<void> {
    // Check for existing salt or generate new one
    const storedSalt = localStorage.getItem(`${this.prefix}salt`);
    
    if (storedSalt) {
      this.salt = new Uint8Array(base64ToArrayBuffer(storedSalt) as ArrayBuffer);
    } else {
      this.salt = getRandomBytes(SALT_LENGTH);
      localStorage.setItem(`${this.prefix}salt`, arrayBufferToBase64(this.salt.buffer as ArrayBuffer));
    }
    
    // Derive encryption key
    this.key = await deriveKey(password, this.salt);
  }
  
  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.key !== null;
  }
  
  /**
   * Store encrypted data
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    if (!this.key || !this.salt) {
      throw new Error('EncryptedStorage not initialized. Call initialize() first.');
    }
    
    const jsonData = JSON.stringify(value);
    const { ciphertext, iv } = await encryptData(jsonData, this.key);
    
    const entry: EncryptedEntry = {
      v: 1,
      s: arrayBufferToBase64(this.salt.buffer as ArrayBuffer),
      iv,
      ct: ciphertext,
      ts: Date.now()
    };
    
    localStorage.setItem(
      `${this.prefix}${key}`,
      JSON.stringify(entry)
    );
  }
  
  /**
   * Retrieve and decrypt data
   */
  async getItem<T>(key: string): Promise<T | null> {
    if (!this.key) {
      throw new Error('EncryptedStorage not initialized. Call initialize() first.');
    }
    
    const stored = localStorage.getItem(`${this.prefix}${key}`);
    if (!stored) return null;
    
    try {
      const entry: EncryptedEntry = JSON.parse(stored);
      
      // Version check for future migrations
      if (entry.v !== 1) {
        console.warn(`Unknown encryption version: ${entry.v}`);
      }
      
      const decrypted = await decryptData(entry.ct, entry.iv, this.key);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to decrypt storage item:', error);
      return null;
    }
  }
  
  /**
   * Remove encrypted item
   */
  removeItem(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`);
  }
  
  /**
   * Clear all encrypted storage
   */
  clear(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.key = null;
    this.salt = null;
  }
  
  /**
   * Get all encrypted keys
   */
  keys(): string[] {
    const result: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix) && key !== `${this.prefix}salt`) {
        result.push(key.substring(this.prefix.length));
      }
    }
    
    return result;
  }
  
  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(`${this.prefix}${key}`) !== null;
  }
  
  /**
   * Get entry metadata without decrypting
   */
  getMetadata(key: string): { timestamp: number; version: number } | null {
    const stored = localStorage.getItem(`${this.prefix}${key}`);
    if (!stored) return null;
    
    try {
      const entry: EncryptedEntry = JSON.parse(stored);
      return {
        timestamp: entry.ts,
        version: entry.v
      };
    } catch {
      return null;
    }
  }
}

/**
 * React hook for encrypted storage
 */
export function useEncryptedStorage<T>(
  storage: EncryptedStorage,
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>, boolean] {
  // This would need to be implemented with React imports
  // For now, return the interface signature
  throw new Error('useEncryptedStorage requires React runtime');
}

/**
 * Create encrypted storage instance with Zustand integration
 */
export function createEncryptedStorageEngine(password: string) {
  const storage = new EncryptedStorage();
  
  return {
    async initialize() {
      await storage.initialize(password);
    },
    
    getItem: async (name: string) => {
      if (!storage.isInitialized()) return null;
      return storage.getItem(name);
    },
    
    setItem: async (name: string, value: unknown) => {
      if (!storage.isInitialized()) return;
      await storage.setItem(name, value);
    },
    
    removeItem: (name: string) => {
      storage.removeItem(name);
    }
  };
}

// Export singleton for app-wide usage
export const encryptedStorage = new EncryptedStorage();
