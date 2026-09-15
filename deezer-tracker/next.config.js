/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Repo project page: https://93mylu22.github.io/deezer-tracker
  basePath: "/deezer-tracker",
  assetPrefix: "/deezer-tracker/",
};

module.exports = nextConfig;
