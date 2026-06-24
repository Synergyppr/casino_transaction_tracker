import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/CasinoPlayerTracking/:path*",
        destination:
          "https://synergymwprod-hdbrdrhpawachjbx.eastus-01.azurewebsites.net/api/CasinoPlayerTracking/:path*",
      },
    ];
  },
};

export default nextConfig;
