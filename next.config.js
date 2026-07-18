/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/AIDD',
  assetPrefix: '/AIDD/',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig 