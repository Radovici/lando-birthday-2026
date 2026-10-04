/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/party',
  assetPrefix: '/party',
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://longovici.com/lando',
        basePath: false,
        permanent: false,
      },
    ];
  },
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
