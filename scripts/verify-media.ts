import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function verify() {
  console.log('--- Verifying Payload Media ---')
  const config = await configPromise;
  console.log('Config Secret Length:', config.secret?.length || 0)
  try {
    const payload = await getPayload({ config })
    
    // Check Media
    const media = await payload.find({
      collection: 'media',
      limit: 100,
    })
    
    console.log(`Total Media Docs: ${media.totalDocs}`)
    media.docs.forEach(m => {
      console.log(`- ID: ${m.id} | Filename: ${m.filename} | URL: ${m.url}`)
    })

    // Check Projects and their image links
    const projects = await payload.find({
      collection: 'projects',
      limit: 10,
    })
    console.log(`\nTotal Projects: ${projects.totalDocs}`)
    projects.docs.forEach(p => {
        console.log(`- Project: ${p.title} | Image ID: ${typeof p.image === 'object' ? p.image?.id : p.image}`)
    })

  } catch (error) {
    console.error('Verification failed:', error)
  }
  process.exit(0)
}

verify()
