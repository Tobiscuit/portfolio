import { connection } from 'next/server'
import { getPayload } from 'payload'
import React from 'react'

import config from '@payload-config'

// The one public page: projects read from D1 on every request (connection() ties the render to the
// request; nothing here is prerendered at build time). Plain <img>, not next/image: the spike has no
// IMAGES binding and measure.sh looks for the raw /api/media/file/<name> URL in the HTML.
export default async function HomePage() {
  await connection()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'projects',
    depth: 1,
    limit: 50,
    sort: '-createdAt',
  })

  return (
    <main>
      <h1>Projects</h1>
      {docs.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {docs.map((project) => {
            const cover = typeof project.cover === 'object' && project.cover ? project.cover : null
            return (
              <li key={project.id}>
                {cover?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
                    alt={cover.alt}
                    width={cover.width ?? undefined}
                    height={cover.height ?? undefined}
                  />
                ) : null}
                <h2>{project.title}</h2>
                <p>{project.summary}</p>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
