'use client'

import Header from './Header'
import JoyHeader from './JoyHeader'
import { useHeader } from './HeaderProvider'

export default function DynamicHeader() {
  const { useJoyUI } = useHeader()

  return useJoyUI ? <JoyHeader /> : <Header />
}
