import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },

  allowedDevOrigins: [
    "localhost:3000",
    "100.90.83.38:3000",
    "*.local:3000",
    "http://100.90.83.38:3000",
    "100.105.155.99:3000",
    "http://100.105.155.99:3000",
    "100.90.83.38",
    "100.105.155.99",
    "http://100.90.83.38",
    "http://100.105.155.99"
  ],

  // Allow dev requests from any origin on local network for easy development
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "10.65.244.99:3000",    // Local network IP
        "100.105.155.99:3000",  // Tailscale IP
        // Wildcards for local network
        "*.local:3000",
      ],
    },
  },
};

export default nextConfig;
