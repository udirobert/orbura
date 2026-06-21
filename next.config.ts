import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Pull the local `@eazo/sdk` (hard-copied into node_modules by
  // `bun run sdk:sync`) into Next's watch + transpile graph. Without
  // this, changes inside `node_modules/@eazo/sdk/dist/` don't trigger
  // RFC1918 LAN ranges + localhost for `next dev` HMR over Wi-Fi.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
  // Enable WebAssembly support for Edge AI (ONNX Runtime) and ZK (EZKL)
  async headers() {
    return [
      {
        source: "/face-scan",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // Self-hosted MediaPipe assets. `application/wasm` is already
        // Next.js's default MIME for .wasm (mime-db), so we only set
        // cache headers here. Setting Content-Type here would also
        // catch the .js loader scripts and break them — browsers
        // refuse to execute a <script> served as application/wasm.
        source: "/mediapipe/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  turbopack: {},
  serverExternalPackages: [
    "@qvac/sdk",
    "@ezkljs/engine",
    "@esbuild/darwin-arm64",
    "@esbuild/darwin-x64",
    "esbuild",
    "tsx",
  ],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
