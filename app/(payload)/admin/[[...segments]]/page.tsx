import configPromise from '@payload-config'
import { RootPage } from '@payloadcms/next/views'
/* This file is strictly for the Payload admin. */
import { importMap } from '@/app/(payload)/admin/importMap.js' // This will be generated, might error initially until generation
import React from 'react'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

const Page = ({ params, searchParams }: Args) => (
  <RootPage config={configPromise} params={params} searchParams={searchParams} importMap={importMap} />
)

export default Page
