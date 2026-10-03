/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/party',
  assetPrefix: '/party',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'henaaqgmnevwiehbubaf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
