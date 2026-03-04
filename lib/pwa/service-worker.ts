/**
 * Elite Service Worker with Ihsān Principles
 * 
 * Progressive Web App capabilities featuring:
 * - Offline-first architecture
 * - Strategic caching strategies
 * - Background sync
 * - Push notifications
 * - Precaching critical assets
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CacheStrategy {
  name: string;
  match: (request: Request) => boolean;
  handler: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';
  options?: {
    cacheName?: string;
    maxAgeSeconds?: number;
    maxEntries?: number;
    networkTimeoutSeconds?: number;
  };
}

export interface PrecacheEntry {
  url: string;
  revision?: string;
}

export interface SyncTask {
  id: string;
  tag: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// ============================================================================
// Cache Names
// ============================================================================

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  precache: `bizra-precache-${CACHE_VERSION}`,
  runtime: `bizra-runtime-${CACHE_VERSION}`,
  images: `bizra-images-${CACHE_VERSION}`,
  api: `bizra-api-${CACHE_VERSION}`,
  fonts: `bizra-fonts-${CACHE_VERSION}`
} as const;

// ============================================================================
// Service Worker Configuration Generator
// ============================================================================

export function generateServiceWorkerConfig(options: {
  precacheManifest?: PrecacheEntry[];
  cacheStrategies?: CacheStrategy[];
  skipWaiting?: boolean;
  clientsClaim?: boolean;
}): string {
  const {
    precacheManifest = [],
    cacheStrategies = getDefaultCacheStrategies(),
    skipWaiting = true,
    clientsClaim = true
  } = options;

  return `
// Auto-generated Service Worker - BIZRA Elite PWA
// Version: ${CACHE_VERSION}

const CACHE_NAMES = ${JSON.stringify(CACHE_NAMES)};
const PRECACHE_MANIFEST = ${JSON.stringify(precacheManifest)};

// ============================================================================
// Installation
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.precache);
      
      // Precache critical assets
      const urlsToCache = PRECACHE_MANIFEST.map(entry => 
        typeof entry === 'string' ? entry : entry.url
      );
      
      await cache.addAll(urlsToCache);
      
      ${skipWaiting ? 'self.skipWaiting();' : ''}
    })()
  );
});

// ============================================================================
// Activation
// ============================================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const currentCaches = Object.values(CACHE_NAMES);
      
      await Promise.all(
        cacheNames
          .filter(name => !currentCaches.includes(name))
          .map(name => caches.delete(name))
      );
      
      ${clientsClaim ? 'await self.clients.claim();' : ''}
    })()
  );
});

// ============================================================================
// Fetch Handler
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  // Strategy: Cache First for static assets
  if (isStaticAsset(url)) {
    return cacheFirst(request, CACHE_NAMES.precache);
  }
  
  // Strategy: Stale While Revalidate for images
  if (isImage(url)) {
    return staleWhileRevalidate(request, CACHE_NAMES.images, {
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
    });
  }
  
  // Strategy: Network First for API calls
  if (isApiCall(url)) {
    return networkFirst(request, CACHE_NAMES.api, {
      networkTimeoutSeconds: 10,
      maxAgeSeconds: 5 * 60 // 5 minutes
    });
  }
  
  // Strategy: Network First for pages (with offline fallback)
  if (isPage(url)) {
    return networkFirst(request, CACHE_NAMES.runtime, {
      networkTimeoutSeconds: 5
    });
  }
  
  // Default: Network with cache fallback
  return networkFirst(request, CACHE_NAMES.runtime);
}

// ============================================================================
// Caching Strategies
// ============================================================================

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, options = {}) {
  const { networkTimeoutSeconds = 10 } = options;
  const cache = await caches.open(cacheName);
  
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), networkTimeoutSeconds * 1000);
    });
    
    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function staleWhileRevalidate(request, cacheName, options = {}) {
  const { maxEntries = 50, maxAgeSeconds = 86400 } = options;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      cleanupCache(cacheName, maxEntries);
    }
    return response;
  }).catch(() => null);
  
  // Return cached immediately if available
  if (cached) {
    // Check if stale
    const cachedDate = cached.headers.get('date');
    if (cachedDate) {
      const age = (Date.now() - new Date(cachedDate).getTime()) / 1000;
      if (age > maxAgeSeconds) {
        // Wait for network if stale
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;
      }
    }
    return cached;
  }
  
  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  return networkResponse || new Response('Offline', { status: 503 });
}

async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ============================================================================
// URL Matchers
// ============================================================================

function isStaticAsset(url) {
  return /\\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname) ||
         url.pathname.startsWith('/_next/static/');
}

function isImage(url) {
  return /\\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(url.pathname);
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/');
}

function isPage(url) {
  return url.pathname === '/' || 
         !url.pathname.includes('.') ||
         url.pathname.endsWith('.html');
}

// ============================================================================
// Background Sync
// ============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(handleBackgroundSync(event.tag));
  }
});

async function handleBackgroundSync(tag) {
  const db = await openSyncDB();
  const tasks = await getSyncTasks(db, tag);
  
  for (const task of tasks) {
    try {
      await processSyncTask(task);
      await deleteSyncTask(db, task.id);
    } catch (error) {
      // Increment retry count
      task.retries++;
      if (task.retries < 3) {
        await updateSyncTask(db, task);
      } else {
        await deleteSyncTask(db, task.id);
      }
    }
  }
}

async function processSyncTask(task) {
  const { data } = task;
  // Process based on task type
  if (data.type === 'analytics') {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.payload)
    });
  }
}

// IndexedDB helpers for sync
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bizra-sync', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
    };
  });
}

function getSyncTasks(db, tag) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const tasks = request.result.filter(t => t.tag === tag);
      resolve(tasks);
    };
  });
}

function deleteSyncTask(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function updateSyncTask(db, task) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const request = store.put(task);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// Push Notifications
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const payload = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      data: payload.data,
      actions: payload.actions || [],
      vibrate: [200, 100, 200],
      tag: payload.tag || 'default',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event.notification;
  
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window' });
      
      // Focus existing window or open new
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          await client.focus();
          if (data?.url) {
            client.navigate(data.url);
          }
          return;
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(data?.url || '/');
      }
    })()
  );
});

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls, payload.cacheName));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      }));
      break;
  }
});

async function cacheUrls(urls, cacheName = CACHE_NAMES.runtime) {
  const cache = await caches.open(cacheName);
  await cache.addAll(urls);
}

async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = { size: keys.length };
  }
  
  return status;
}

console.log('[Service Worker] Initialized - BIZRA Elite PWA ${CACHE_VERSION}');
`;
}

// ============================================================================
// Default Cache Strategies
// ============================================================================

export function getDefaultCacheStrategies(): CacheStrategy[] {
  return [
    {
      name: 'static-assets',
      match: (request) => /\.(js|css|woff2?)$/i.test(request.url),
      handler: 'cacheFirst',
      options: {
        cacheName: CACHE_NAMES.precache
      }
    },
    {
      name: 'images',
      match: (request) => /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(request.url),
      handler: 'staleWhileRevalidate',
      options: {
        cacheName: CACHE_NAMES.images,
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      }
    },
    {
      name: 'api-calls',
      match: (request) => request.url.includes('/api/'),
      handler: 'networkFirst',
      options: {
        cacheName: CACHE_NAMES.api,
        networkTimeoutSeconds: 10,
        maxAgeSeconds: 5 * 60 // 5 minutes
      }
    },
    {
      name: 'pages',
      match: (request) => request.mode === 'navigate',
      handler: 'networkFirst',
      options: {
        cacheName: CACHE_NAMES.runtime,
        networkTimeoutSeconds: 5
      }
    }
  ];
}

// ============================================================================
// PWA Registration Helper
// ============================================================================

export class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCallbacks: Set<() => void> = new Set();
  
  async register(swUrl: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }
    
    try {
      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      });
      
      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              this.notifyUpdate();
            }
          });
        }
      });
      
      console.log('[PWA] Service Worker registered');
      return this.registration;
    } catch (error) {
      console.error('[PWA] Registration failed:', error);
      return null;
    }
  }
  
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    return this.registration.unregister();
  }
  
  onUpdate(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }
  
  private notifyUpdate(): void {
    this.updateCallbacks.forEach(cb => cb());
  }
  
  skipWaiting(): void {
    this.registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
  
  async cacheUrls(urls: string[], cacheName?: string): Promise<void> {
    navigator.serviceWorker.controller?.postMessage({
      type: 'CACHE_URLS',
      payload: { urls, cacheName }
    });
  }
  
  async clearCache(cacheName?: string): Promise<void> {
    navigator.serviceWorker.controller?.postMessage({
      type: 'CLEAR_CACHE',
      payload: { cacheName }
    });
  }
  
  async getCacheStatus(): Promise<Record<string, { size: number }>> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);
      
      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      );
    });
  }
  
  // Push Notifications
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) return null;
    
    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });
      
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }
  
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) return false;
    
    const subscription = await this.registration.pushManager.getSubscription();
    if (subscription) {
      return subscription.unsubscribe();
    }
    return false;
  }
  
  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray.buffer as ArrayBuffer;
  }
  
  // Background Sync
  async registerSync(tag: string): Promise<void> {
    if (!this.registration) return;
    
    try {
      await (this.registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> }
      }).sync.register(tag);
    } catch (error) {
      console.warn('[PWA] Background sync not supported:', error);
    }
  }
  
  // Install Prompt
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  
  captureInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
    });
  }
  
  async promptInstall(): Promise<'accepted' | 'dismissed' | null> {
    if (!this.deferredPrompt) return null;
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    
    return outcome;
  }
  
  get canInstall(): boolean {
    return this.deferredPrompt !== null;
  }
}

// Type augmentation for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let pwaManager: PWAManager | null = null;

export function getPWAManager(): PWAManager {
  if (!pwaManager) {
    pwaManager = new PWAManager();
  }
  return pwaManager;
}

export default PWAManager;
