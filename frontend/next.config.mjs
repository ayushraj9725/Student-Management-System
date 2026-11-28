/** @type {import('next').NextConfig} */
// Dynamically reads BACKEND_URL:
// - Localhost Development: defaults to 'http://127.0.0.1:8085' (using IPv4 127.0.0.1 to avoid Windows Node.js ::1 ECONNREFUSED)
// - Deployed Production: set environment variable BACKEND_URL=https://api.yourproductiondomain.com
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8085';

// When running parallel dev servers (Port 4000 for Schools vs Port 4001 for Platform Ops),
// isolate distDir so simultaneous dev processes never collide or corrupt Webpack vendor chunks.
const isDev = process.env.NODE_ENV !== 'production';
const portIndex = process.argv.indexOf('-p');
const port = portIndex !== -1 ? process.argv[portIndex + 1] : process.env.PORT;
const distDir = isDev && port ? `.next_${port}` : '.next';

const nextConfig = {
  distDir,
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
