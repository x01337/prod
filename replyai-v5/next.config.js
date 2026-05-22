/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Standalone output bundles only what's needed to run — crucial for Docker
  output: "standalone",
  // Suppress punycode deprecation noise
  experimental: {},
};
