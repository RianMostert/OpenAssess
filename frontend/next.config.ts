import type { NextConfig } from "next";
import { NextConfig as NextJsConfig } from "next";

const nextConfig: NextJsConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
