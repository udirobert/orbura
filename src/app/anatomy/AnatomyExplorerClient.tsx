"use client";

import dynamic from "next/dynamic";

// The explorer mounts a WebGL canvas and a three.js scene — load it on the
// client only so the server never tries to render a canvas. A thin client
// wrapper is required because `ssr: false` cannot be used in a Server
// Component in Next.js 16.
const AnatomyExplorer = dynamic(
  () => import("@/components/anatomy/AnatomyExplorer").then((m) => m.AnatomyExplorer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f1e8",
          color: "#8d847c",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        Loading anatomy explorer…
      </div>
    ),
  },
);

export function AnatomyExplorerClient() {
  return <AnatomyExplorer />;
}
