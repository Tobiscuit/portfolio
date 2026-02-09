import configPromise from '@payload-config'
import { RootLayout } from '@payloadcms/next/layouts'
/* This file is strictly for the Payload admin. */
import '@payloadcms/next/css'
import React from 'react'

import { handleServerFunctions } from '@payloadcms/next/layouts'
import { importMap } from '@/app/(payload)/admin/importMap.js'

const Layout = ({ children }: { children: React.ReactNode }) => {
  async function serverFunction(args: { name: string; args: any }) {
    'use server'
    return handleServerFunctions({
      ...args,
      config: configPromise,
      importMap,
    })
  }

  return (
    <RootLayout config={configPromise} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}

export default Layout
