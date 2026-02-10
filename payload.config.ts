import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Projects],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET?.trim() || '',
      config: {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim() || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() || '',
        },
        region: process.env.AWS_REGION?.trim() || 'us-east-1',
        endpoint: `https://s3.${process.env.AWS_REGION?.trim() || 'us-east-1'}.amazonaws.com`,
        forcePathStyle: true, // Often needed for specific regions/S3 compatibility
        // ... Other S3 configuration
      },
    }),
  ],
})
