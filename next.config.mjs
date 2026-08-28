import path from "node:path";
import { fileURLToPath } from "node:url";
import withPWAInit from "next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  turbopack: {
    root: __dirname,
  },

  serverExternalPackages: [
    "@tensorflow/tfjs",
    "@tensorflow-models/face-landmarks-detection",
    "@mediapipe/face_mesh",
  ],

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

export default withPWA(nextConfig);