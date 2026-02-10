import { projects as hardcodedProjects } from './project-data'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Project } from './types'

export async function getProjects(): Promise<Project[]> {
  const usePayload = process.env.NEXT_PUBLIC_USE_PAYLOAD_DATA === 'true'
  
  if (!usePayload) {
    return hardcodedProjects as Project[]
  }

  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'projects',
      sort: 'order',
      depth: 1, // Get media objects
    })

    // Map Payload docs back to the frontend types
    return (docs as any[]).map(doc => ({
      id: doc.order as number || 0, // Using order as ID for consistent routing
      title: doc.title,
      description: doc.description,
      features: (doc.features || []).map((f: any) => f.feature),
      tech: (doc.tech || []).map((t: any) => t.name),
      image: doc.image && typeof doc.image === 'object' ? `/media/${(doc.image as any).filename}` : (typeof doc.image === 'string' ? doc.image : undefined),
      blurDataURL: doc.image && typeof doc.image === 'object' ? (doc.image as any).blurDataURL : undefined,
      url: doc.url || undefined,
      caseStudy: doc.caseStudy ? {
        intro: {
            title: doc.caseStudy.intro.title,
            text: doc.caseStudy.intro.text,
            image: doc.caseStudy.intro.image && typeof doc.caseStudy.intro.image === 'object' ? `/media/${(doc.caseStudy.intro.image as any).filename}` : undefined,
            blurDataURL: doc.caseStudy.intro.image && typeof doc.caseStudy.intro.image === 'object' ? (doc.caseStudy.intro.image as any).blurDataURL : undefined,
            imageAlt: doc.caseStudy.intro.imageAlt || undefined,
        },
        sections: (doc.caseStudy.sections || []).map((s: any) => ({
            title: s.title,
            text: s.text,
            image: s.image && typeof s.image === 'object' ? `/media/${(s.image as any).filename}` : undefined,
            blurDataURL: s.image && typeof s.image === 'object' ? (s.image as any).blurDataURL : undefined,
            imageAlt: s.imageAlt || undefined,
            list: (s.list || []).map((l: any) => l.item)
        })),
        conclusion: {
            title: doc.caseStudy.conclusion.title,
            text: doc.caseStudy.conclusion.text
        },
        futureWork: doc.caseStudy.futureWork ? {
            title: doc.caseStudy.futureWork.title,
            intro: doc.caseStudy.futureWork.intro,
            points: (doc.caseStudy.futureWork.points || []).map((p: any) => ({
                title: p.title,
                text: p.text
            }))
        } : undefined,
        finalArchitecture: doc.caseStudy.finalArchitecture ? {
            title: doc.caseStudy.finalArchitecture.title,
            text: doc.caseStudy.finalArchitecture.text,
            image: doc.caseStudy.finalArchitecture.image && typeof doc.caseStudy.finalArchitecture.image === 'object' ? `/media/${(doc.caseStudy.finalArchitecture.image as any).filename}` : undefined,
            imageAlt: doc.caseStudy.finalArchitecture.imageAlt
        } : undefined
      } : undefined
    }))
  } catch (error) {
    console.error('Failed to fetch from Payload, falling back to hardcoded data:', error)
    return hardcodedProjects as Project[]
  }
}

export async function getProject(slugOrId: string | number): Promise<Project | undefined> {
  const projects = await getProjects()
  return projects.find(p => p.id === Number(slugOrId) || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === slugOrId)
}
