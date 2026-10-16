/**
 * Characterization tests for getProjects/getProject: they pin the mapping from
 * Payload documents to the frontend Project type and the fallback behaviour,
 * so a dependency upgrade that changes either is caught here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { find, getPayload } = vi.hoisted(() => {
  const find = vi.fn()
  return { find, getPayload: vi.fn(async () => ({ find })) }
})

vi.mock('payload', () => ({ getPayload }))
vi.mock('@payload-config', () => ({ default: Promise.resolve({ stub: true }) }))

import { getProject, getProjects } from './getProjects'
import { projects as hardcoded } from './project-data'

const media = (filename: string, blurDataURL?: string) => ({
  id: `media-${filename}`,
  filename,
  ...(blurDataURL ? { blurDataURL } : {}),
})

const fullDoc = {
  id: 'doc-1',
  order: 7,
  title: 'Ledger',
  description: 'A ledger.',
  features: [{ feature: 'Fast' }, { feature: 'Safe' }],
  tech: [{ name: 'Next.js' }, { name: 'Postgres' }],
  image: media('ledger.webp', 'data:image/webp;base64,AAA'),
  url: 'https://ledger.example',
  caseStudy: {
    intro: {
      title: 'Intro',
      text: '<p>Hi</p>',
      image: media('intro.png', 'data:intro'),
      imageAlt: 'Intro alt',
    },
    sections: [
      {
        title: 'S1',
        text: 'T1',
        image: media('s1.png'),
        imageAlt: 'S1 alt',
        list: [{ item: 'one' }, { item: 'two' }],
      },
      { title: 'S2', text: 'T2', image: null, imageAlt: null, list: null },
    ],
    conclusion: { title: 'Done', text: 'Bye' },
    futureWork: { title: 'Next', intro: 'Soon', points: [{ title: 'P1', text: 'PT1' }] },
    finalArchitecture: {
      title: 'Arch',
      text: 'AT',
      image: media('arch.png', 'data:arch'),
      imageAlt: 'Arch alt',
    },
  },
}

describe('getProjects', () => {
  beforeEach(() => {
    find.mockReset()
    getPayload.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns the hardcoded projects without touching Payload unless NEXT_PUBLIC_USE_PAYLOAD_DATA is "true"', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', undefined)
    expect(await getProjects()).toBe(hardcoded)

    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'TRUE')
    expect(await getProjects()).toBe(hardcoded)

    expect(getPayload).not.toHaveBeenCalled()
  })

  it('queries the projects collection sorted by order with media populated', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'true')
    find.mockResolvedValue({ docs: [] })

    expect(await getProjects()).toEqual([])
    expect(find).toHaveBeenCalledWith({ collection: 'projects', sort: 'order', depth: 1 })
  })

  it('maps a full Payload document onto the frontend Project shape', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'true')
    find.mockResolvedValue({ docs: [fullDoc] })

    expect(await getProjects()).toEqual([
      {
        id: 7,
        title: 'Ledger',
        description: 'A ledger.',
        features: ['Fast', 'Safe'],
        tech: ['Next.js', 'Postgres'],
        image: '/media/ledger.webp',
        blurDataURL: 'data:image/webp;base64,AAA',
        url: 'https://ledger.example',
        caseStudy: {
          intro: {
            title: 'Intro',
            text: '<p>Hi</p>',
            image: '/media/intro.png',
            blurDataURL: 'data:intro',
            imageAlt: 'Intro alt',
          },
          sections: [
            {
              title: 'S1',
              text: 'T1',
              image: '/media/s1.png',
              blurDataURL: undefined,
              imageAlt: 'S1 alt',
              list: ['one', 'two'],
            },
            {
              title: 'S2',
              text: 'T2',
              image: undefined,
              blurDataURL: undefined,
              imageAlt: undefined,
              list: [],
            },
          ],
          conclusion: { title: 'Done', text: 'Bye' },
          futureWork: { title: 'Next', intro: 'Soon', points: [{ title: 'P1', text: 'PT1' }] },
          finalArchitecture: {
            title: 'Arch',
            text: 'AT',
            image: '/media/arch.png',
            imageAlt: 'Arch alt',
          },
        },
      },
    ])
  })

  it('tolerates a minimal document and keeps a string image URL as-is', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'true')
    find.mockResolvedValue({
      docs: [
        { id: 'a', order: 0, title: 'Bare', description: 'd' },
        { id: 'b', order: 2, title: 'Str', description: 'd', image: 'https://cdn.example/x.png', url: '' },
      ],
    })

    expect(await getProjects()).toEqual([
      {
        id: 0,
        title: 'Bare',
        description: 'd',
        features: [],
        tech: [],
        image: undefined,
        blurDataURL: undefined,
        url: undefined,
        caseStudy: undefined,
      },
      {
        id: 2,
        title: 'Str',
        description: 'd',
        features: [],
        tech: [],
        image: 'https://cdn.example/x.png',
        blurDataURL: undefined,
        url: undefined,
        caseStudy: undefined,
      },
    ])
  })

  it('falls back to the hardcoded projects when Payload fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'true')
    find.mockRejectedValue(new Error('mongo down'))

    expect(await getProjects()).toBe(hardcoded)
    expect(console.error).toHaveBeenCalledWith(
      'Failed to fetch from Payload, falling back to hardcoded data:',
      expect.any(Error),
    )
  })
})

describe('getProject', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    find.mockReset()
  })

  it('finds a project by numeric id, as a number or a string', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', undefined)
    const first = hardcoded[0]
    expect(await getProject(first.id)).toBe(first)
    expect(await getProject(String(first.id))).toBe(first)
    expect(await getProject('no-such-project')).toBeUndefined()
  })

  it('finds a project by the slug derived from its title', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_PAYLOAD_DATA', 'true')
    find.mockResolvedValue({
      docs: [{ id: 'x', order: 3, title: "Hello, World! It's 2026", description: 'd' }],
    })

    const project = await getProject('hello-world-it-s-2026')
    expect(project?.id).toBe(3)
  })
})
