'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface HeaderContextType {
  useJoyUI: boolean
  toggleHeader: () => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [useJoyUI, setUseJoyUI] = useState(false)

  const toggleHeader = () => {
    setUseJoyUI(!useJoyUI)
  }

  return (
    <HeaderContext.Provider value={{ useJoyUI, toggleHeader }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}
