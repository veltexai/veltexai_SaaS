import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // .eslintrc.json was added for editor/CI linting, but the repo carries
    // pre-existing lint debt in legacy areas; don't let it fail `next build`.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'vzhasjprwsvxpzbzyfsl.supabase.co',
      'iwoaaljitifloolszxlu.supabase.co',
    ],
  },
};

export default nextConfig;
