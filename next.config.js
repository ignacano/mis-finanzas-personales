/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  // Dev chunk URLs are not content-hashed, so a cached copy outlives an edit.
  async headers() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [{ source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] }];
  },
  // Next 16 blocks unlisted origins on /_next/* in dev (including the HMR websocket, which
  // breaks hydration silently). `localhost` is allowed by default; add any other host you
  // browse the dev server from via ALLOWED_DEV_ORIGINS (comma-separated).
  allowedDevOrigins: ['127.0.0.1', ...(process.env.ALLOWED_DEV_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)],
};

module.exports = nextConfig;
