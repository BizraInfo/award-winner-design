/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === 'production';

// Environment-specific CSP configuration
// Production: Strict CSP without unsafe-eval/unsafe-inline
// Development: Relaxed CSP for hot reload, debugging, etc.
const getContentSecurityPolicy = () => {
  if (isProduction) {
    return [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration scripts and inline data.
      // TODO: migrate to nonce-based CSP via next/headers middleware.
      // unpkg.com: React/Babel runtime for /films and /install static pages
      // (vendor locally and remove — tracked in Dema board TASK-024).
      "script-src 'self' 'unsafe-inline' blob: https://unpkg.com",
      // Inline styles used extensively by sovereign components (TrustSite, design-tokens).
      // TODO: migrate inline styles to Tailwind classes, then remove unsafe-inline.
      // fonts.googleapis.com: stylesheet for /films and /install static pages.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      // Google Fonts loaded from layout.tsx via next/font
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
  }
  
  // Development: Allow unsafe-eval and unsafe-inline for DX
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://unpkg.com",  // Required for HMR/Three.js in dev + /films runtime
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",             // Required for styled components in dev + /films fonts
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss: ws:",                      // ws: for webpack HMR
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
};

const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Clean URLs for the static public/ showcases (Next does not
  // directory-index public/, so /films alone would 404).
  async redirects() {
    return [
      { source: '/films', destination: '/films/index.html', permanent: false },
      { source: '/install', destination: '/install/index.html', permanent: false },
    ];
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  
  // Security Headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // Content Security Policy - environment-aware
          {
            key: 'Content-Security-Policy',
            value: getContentSecurityPolicy(),
          },
          // HTTP Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',                    // Disable camera
              'microphone=()',                // Disable microphone
              'geolocation=()',               // Disable geolocation
              'interest-cohort=()',           // Disable FLoC
              'accelerometer=(self)',         // Allow for 3D
              'gyroscope=(self)',             // Allow for 3D
              'magnetometer=()',
              'payment=()',
              'usb=()',
            ].join(', '),
          },
          // DNS Prefetch Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  // Bundle analyzer (when ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../bundle-analysis.html',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),
}

export default nextConfig
