import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'tech',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text',
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'url',
      type: 'text',
    },
    {
      name: 'caseStudy',
      type: 'group',
      fields: [
        {
          name: 'intro',
          type: 'group',
          fields: [
            { name: 'title', type: 'text', required: false },
            { name: 'text', type: 'textarea', required: false }, // Using textarea for HTML content
            { name: 'image', type: 'upload', relationTo: 'media' },
            { name: 'imageAlt', type: 'text' },
          ],
        },
        {
          name: 'sections',
          type: 'array',
          fields: [
            { name: 'title', type: 'text', required: false },
            { name: 'text', type: 'textarea', required: false },
            { name: 'image', type: 'upload', relationTo: 'media' },
            { name: 'imageAlt', type: 'text' },
            {
              name: 'list',
              type: 'array',
              fields: [
                { name: 'item', type: 'textarea' },
              ],
            },
          ],
        },
        {
          name: 'conclusion',
          type: 'group',
          fields: [
            { name: 'title', type: 'text', required: false },
            { name: 'text', type: 'textarea', required: false },
          ],
        },
        {
          name: 'futureWork',
          type: 'group',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'intro', type: 'textarea' },
            {
              name: 'points',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'text', type: 'textarea' },
              ],
            },
          ],
        },
        {
          name: 'finalArchitecture',
          type: 'group',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'text', type: 'textarea' },
            { name: 'image', type: 'upload', relationTo: 'media' },
            { name: 'imageAlt', type: 'text' },
          ],
        },
      ],
    },
  ],
  defaultSort: 'order',
}
