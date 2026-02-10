
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import mime from 'mime-types'
import dotenv from 'dotenv'
import type { Payload } from 'payload'

// 1. Load Environment Variables FIRST
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true })

console.log('AWS_REGION:', process.env.AWS_REGION)
console.log('S3_BUCKET:', process.env.S3_BUCKET)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper: Upload Image
async function uploadImage(payload: Payload, relativePath: string | undefined): Promise<string | undefined> {
  if (!relativePath) return undefined
  
  const imagePath = path.join(process.cwd(), 'public', relativePath)
  if (!fs.existsSync(imagePath)) {
    console.warn(`  ⚠️ Image not found: ${relativePath}`)
    return undefined
  }

  try {
    const fileBuffer = fs.readFileSync(imagePath)
    const fileName = path.basename(imagePath)
    const mimeType = mime.lookup(imagePath) || 'application/octet-stream'

    // Check if media already exists
    const existingMedia = await payload.find({
      collection: 'media',
      where: {
        filename: { equals: fileName },
      },
    })

    if (existingMedia.totalDocs > 0) {
        return existingMedia.docs[0].id as string
    }

    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: fileName,
      },
      file: {
        data: fileBuffer,
        name: fileName,
        mimetype: mimeType,
        size: fileBuffer.length,
      },
    })
    
    console.log(`  ✅ Uploaded: ${fileName}`)
    return mediaDoc.id as string
  } catch (error: any) {
    console.error(`  ❌ Upload failed for ${relativePath}: ${error.message}`)
    return undefined
  }
}

async function seed() {
  console.log('🌱 Starting full seeding process...')

  const { default: config } = await import('@payload-config')
  const { getPayload } = await import('payload')
  const { projects } = await import('../app/lib/project-data')

  try {
    const payload = await getPayload({ config })

    console.log('🗑️  Clearing existing projects and media for a clean start...')
    await payload.delete({ collection: 'projects', where: { title: { exists: true } } })
    // We keep media if we want to save S3 costs, but clearing is safer for testing.
    // For now, let's just clear the projects.

    for (const project of projects) {
        console.log(`\nProcessing: ${project.title}`)

        // 1. Prepare Root Image
        const mainImageId = await uploadImage(payload, project.image)

        // 2. Prepare Case Study Data
        let caseStudyData = null
        if (project.caseStudy) {
            const cs = project.caseStudy
            
            // Map Intro
            const introImageId = await uploadImage(payload, cs.intro.image)
            const intro = {
                title: cs.intro.title,
                text: cs.intro.text,
                image: introImageId,
                imageAlt: cs.intro.imageAlt
            }

            // Map Sections
            const sections = []
            if (cs.sections) {
                for (const section of cs.sections) {
                    const sectionImageId = await uploadImage(payload, section.image)
                    sections.push({
                        title: section.title,
                        text: section.text,
                        image: sectionImageId,
                        imageAlt: section.imageAlt,
                        list: section.list ? section.list.map((item: string) => ({ item })) : []
                    })
                }
            }

            // Map Conclusion
            const conclusion = {
                title: cs.conclusion.title,
                text: cs.conclusion.text
            }

            // Map Future Work
            let futureWork = null
            if (cs.futureWork) {
                futureWork = {
                    title: cs.futureWork.title,
                    intro: cs.futureWork.intro,
                    points: cs.futureWork.points ? cs.futureWork.points.map((p: any) => ({
                        title: p.title,
                        text: p.text
                    })) : []
                }
            }

            // Map Final Architecture
            let finalArchitecture = null
            if (cs.finalArchitecture) {
                const faImageId = await uploadImage(payload, cs.finalArchitecture.image)
                finalArchitecture = {
                    title: cs.finalArchitecture.title,
                    text: cs.finalArchitecture.text,
                    image: faImageId,
                    imageAlt: cs.finalArchitecture.imageAlt
                }
            }

            caseStudyData = {
                intro,
                sections,
                conclusion,
                futureWork,
                finalArchitecture
            }
        }

        // 3. Upsert Project
        const existingProject = await payload.find({
            collection: 'projects',
            where: { title: { equals: project.title } }
        })

        const projectData: any = {
            title: project.title,
            slug: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            description: project.description,
            features: project.features ? project.features.map((f: string) => ({ feature: f })) : [],
            tech: project.tech ? project.tech.map((t: string) => ({ name: t })) : [],
            url: project.url,
            image: mainImageId,
            order: projects.indexOf(project) + 1,
        }

        if (caseStudyData) {
            // Only add sub-objects that exist
            const cleanedCS: any = {}
            if (caseStudyData.intro) cleanedCS.intro = caseStudyData.intro
            if (caseStudyData.sections && caseStudyData.sections.length > 0) cleanedCS.sections = caseStudyData.sections
            if (caseStudyData.conclusion) cleanedCS.conclusion = caseStudyData.conclusion
            if (caseStudyData.futureWork) cleanedCS.futureWork = caseStudyData.futureWork
            if (caseStudyData.finalArchitecture) cleanedCS.finalArchitecture = caseStudyData.finalArchitecture
            
            projectData.caseStudy = cleanedCS
        }

        // Final deep prune of undefined/null
        const prune = (obj: any) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => prune(item))
            } else if (obj && typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    if (obj[key] === null || obj[key] === undefined) {
                        delete obj[key]
                    } else {
                        prune(obj[key])
                        // If it's an object (not array) and now empty, delete it
                        if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && Object.keys(obj[key] || {}).length === 0) {
                            delete obj[key]
                        }
                    }
                })
            }
        }
        prune(projectData)

        console.log(`  📦 Data prepared for "${project.title}":`, JSON.stringify(projectData, null, 2))

        console.log(`  ✨ Creating project...`)
        try {
            await payload.create({
                collection: 'projects',
                data: projectData
            })
            console.log(`  ✅ Project created: ${project.title}`)
        } catch (err: any) {
            console.error(`  ❌ Create failed for ${project.title}:`, err.message)
            if (err.data) console.error('  Error Data:', JSON.stringify(err.data, null, 2))
            throw err
        }
        
        // For debugging, let's stop after the first one
        // break; 
    }

    console.log('\n✅ Seeding complete!')
    process.exit(0)

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message || error)
    if (error.data) {
        console.error('Error Data:', JSON.stringify(error.data, null, 2))
    }
    if (error.stack) {
        console.error('Stack Trace:', error.stack)
    }
    process.exit(1)
  }
}

seed()
