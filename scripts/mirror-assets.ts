import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  
  if (!response.body) throw new Error('No response body')

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  fs.writeFileSync(destPath, buffer)
}

async function run() {
  console.log('🏗️  Starting Static Asset Mirroring...')
  
  // Dynamic imports to ensure env vars are loaded first
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config')

  const payload = await getPayload({ config })
  
  // Create public/media directory
  const mediaDir = path.join(process.cwd(), 'public', 'media')
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true })
  }

  try {
    const { docs: mediaDocs } = await payload.find({
      collection: 'media',
      limit: 1000,
    })

    console.log(`found ${mediaDocs.length} media files to mirror.`)

    const downloads = mediaDocs.map(async (doc: any) => {
      if (doc.url) {
        let fileUrl = doc.url
        // Simplistic check for relative URL
        if (!fileUrl.startsWith('http')) {
           // FORCE us-east-1 because the bucket is there, ignoring local env which might be us-east-2
           const bucketRegion = 'us-east-1' 
           const bucketName = process.env.S3_BUCKET
           fileUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${doc.filename}`
        }

        const fileName = doc.filename
        const destPath = path.join(mediaDir, fileName)

        if (fs.existsSync(destPath)) {
            return
        }

        console.log(`  Downloading: ${fileName}`)
        await downloadFile(fileUrl, destPath)
      }
    })

    await Promise.all(downloads)
    console.log('✅ Static Asset Mirroring Complete.')
    process.exit(0)

  } catch (error) {
    console.error('❌ Mirroring failed:', error)
    process.exit(1)
  }
}

run()
