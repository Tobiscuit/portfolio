import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Add S3 bucket hostname if known, or generic wildcard for now if needed for admin
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      }
    ],
  },
}

export default withPayload(nextConfig)