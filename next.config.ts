import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // 1. Existing Image Configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
   turbopack: {},

  // 2. Prevent server-side processing of heavy AI libraries
  // This fixes issues where Next.js tries to bundle binary files meant for the browser
  serverExternalPackages: [
    '@tensorflow/tfjs', 
    '@tensorflow-models/face-landmarks-detection',
    '@mediapipe/face_mesh' 
  ],

  // 3. Webpack Fallbacks for Browser Compatibility
  // TensorFlow often tries to import Node.js modules (fs, path) which don't exist in the browser.
  // We tell Webpack to ignore them on the client side.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;