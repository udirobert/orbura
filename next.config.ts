import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
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
      // Storybook static build served at /storybook/
      // Entry HTML: no-cache so new deployments are picked up immediately
      {
        source: "/storybook/",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      // Hashed assets (JS/CSS bundles with content hashes): immutable
      {
        source: "/storybook/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  turbopack: {},
  serverExternalPackages: [
    "@qvac/sdk",
    "@qvac/llm-llamacpp",
    "bare-fs",
    "bare-url",
    "bare-stdio",
    "bare-path",
    "bare-process",
    "@ezkljs/engine",
    "@esbuild/darwin-arm64",
    "@esbuild/darwin-x64",
    "esbuild",
    "tsx",
  ],
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // Prevent bare-runtime packages from being bundled into client chunks.
    // These use require.addon() which only exists in the Bare runtime.
    if (!isServer) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const stubPath = path.resolve(__dirname, "scripts/bare-stub.js");
      const stubs = [
        "bare-fs", "bare-url", "bare-stdio", "bare-path", "bare-process",
        "bare-stream", "bare-events", "bare-timers", "bare-signals",
        "bare-inspect", "bare-utils", "bare-os", "bare-encoding",
        "bare-abort", "bare-env", "bare-hrtime", "bare-buffer",
      ];
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      for (const pkg of stubs) {
        config.resolve.alias[pkg] = stubPath;
      }
      // The npm "process" package IS bare-process (same directory).
      // Use exact match so it doesn't shadow the global process polyfill.
      config.resolve.alias["process$"] = stubPath;
      // Stub all binding.js files in bare-* packages
      config.resolve.alias["bare-url/binding.js"] = stubPath;
      config.resolve.alias["bare-fs/binding.js"] = stubPath;
      config.resolve.alias["bare-signals/binding.js"] = stubPath;
      config.resolve.alias["bare-abort/binding.js"] = stubPath;
      config.resolve.alias["bare-events/binding.js"] = stubPath;
      config.resolve.alias["bare-os/binding.js"] = stubPath;
      config.resolve.alias["bare-env/binding.js"] = stubPath;
      config.resolve.alias["bare-hrtime/binding.js"] = stubPath;
      config.resolve.alias["bare-buffer/binding.js"] = stubPath;
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback.fs = false;
      config.resolve.fallback.path = false;
      config.resolve.fallback.child_process = false;
      config.resolve.fallback.crypto = false;
      config.resolve.fallback.os = false;
      // Use NormalModuleReplacementPlugin to catch any bare-*/binding.js
      // that slips through the alias
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpack = require("webpack");
      config.plugins = config.plugins || [];
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /bare-[^/]+\/binding\.js$/,
        stubPath
      ));
    }
    return config;
  },
};

export default nextConfig;
