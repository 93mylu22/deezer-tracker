/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Si publicas en https://tu-usuario.github.io/deezer-tracker (repo project page,
  // NO un repo tipo tu-usuario.github.io), descomenta y ajusta estas dos líneas:
  // basePath: "/deezer-tracker",
  // assetPrefix: "/deezer-tracker/",
};

module.exports = nextConfig;
