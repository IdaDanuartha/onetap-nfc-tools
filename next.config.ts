// next-pwa is CommonJS — must use require()
/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore — next-pwa doesn't ship proper TS types
const withPWA = require("next-pwa");

import type { NextConfig } from "next";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // Bypass cache for Supabase API calls to ensure real-time accuracy
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default pwaConfig(nextConfig);
