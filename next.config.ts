
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google profile pictures
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Ensure environment variables are available on the client-side if prefixed with NEXT_PUBLIC_
  // No specific configuration needed here for that, Next.js handles it automatically.
  // Just make sure they are set in your .env.local or environment.
};

export default nextConfig;

    