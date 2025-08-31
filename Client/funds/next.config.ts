import type { NextConfig } from "next";

// Static export so we can host via S3 + CloudFront without SSR
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
