/** @type {import('next').NextConfig} */
// Dynamically reads BACKEND_URL:
// - Localhost Development: defaults to 'http://127.0.0.1:8085' (using IPv4 127.0.0.1 to avoid Windows Node.js ::1 ECONNREFUSED)
// - Deployed Production: set environment variable BACKEND_URL=https://api.yourproductiondomain.com
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8085';

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
