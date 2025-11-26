import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
};

export default nextConfig;
