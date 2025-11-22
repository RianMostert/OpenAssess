import type { NextConfig } from "next";

// Read backend host from environment (for API proxying)
// In Docker: localhost (same container), in dev: could be different
const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000';

// Parse allowed origins from environment (comma-separated list)
// Falls back to sensible defaults for local development
const parseAllowedOrigins = (envVar: string | undefined, defaults: string[]): string[] => {
  if (!envVar) return defaults;
  return envVar.split(',').map(origin => origin.trim()).filter(Boolean);
};

const defaultAllowedOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  "*.local:3000",
];

const allowedOrigins = parseAllowedOrigins(
  process.env.NEXT_PUBLIC_ALLOWED_ORIGINS,
  defaultAllowedOrigins
);

const nextConfig: NextConfig = {
  // Enable standalone output for production Docker builds
  output: 'standalone',

  // Disable ESLint during builds (handle linting separately)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checks during builds (handle type checking separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Proxy API requests to backend - host/port configurable via env
  async rewrites() {
    const backendUrl = `http://${backendHost}:${backendPort}`;
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/docs',
        destination: `${backendUrl}/docs`,
      },
      {
        source: '/redoc',
        destination: `${backendUrl}/redoc`,
      },
      {
        source: '/openapi.json',
        destination: `${backendUrl}/openapi.json`,
      },
    ];
  },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },

  // Read from environment or use defaults
  allowedDevOrigins: allowedOrigins,

  // Allow dev requests from configured origins
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins,
    },
  },
};

export default nextConfig;
