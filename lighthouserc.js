module.exports = {
  ci: {
    collect: {
      // Start server command
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'started server on',
      startServerReadyTimeout: 30000,
      
      // URLs to audit
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/showcase',
      ],
      
      // Number of runs for statistical significance
      numberOfRuns: 3,
      
      // Chrome flags for consistent testing
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
        preset: 'desktop',
      },
    },
    
    assert: {
      assertions: {
        // Performance budgets
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],      // < 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],    // < 2.5s (LCP budget)
        'interactive': ['error', { maxNumericValue: 3000 }],                  // TTI < 3s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],      // CLS < 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],           // TBT < 300ms
        'speed-index': ['warn', { maxNumericValue: 3000 }],                  // SI < 3s
        
        // Bundle size assertions
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }], // < 500kb scripts
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // < 2MB total
      },
    },
    
    upload: {
      // Temporary public storage for CI
      target: 'temporary-public-storage',
    },
  },
};
