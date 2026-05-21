/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['qwwmpsgcgyqjqfcqfzob.supabase.co'],
  },
  serverExternalPackages: ['sharp'],
};

module.exports = nextConfig;
