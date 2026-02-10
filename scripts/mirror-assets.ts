import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}) // Delete partial file
      reject(err)
    })
  })
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
           const bucketRegion = process.env.AWS_REGION || 'us-east-2'
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
