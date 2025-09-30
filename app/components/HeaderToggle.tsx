'use client'

import { useHeader } from './HeaderProvider'

export default function HeaderToggle() {
  const { useJoyUI, toggleHeader } = useHeader()

  return (
    <button
      onClick={toggleHeader}
      className="fixed bottom-4 right-4 z-50 bg-[#3D5AFE] hover:bg-[#2C4AE5] text-white px-4 py-2 rounded-full shadow-lg transition-colors duration-200 text-sm font-medium"
      title={`Switch to ${useJoyUI ? 'Original' : 'Joy UI'} header`}
    >
      {useJoyUI ? 'Original' : 'Joy UI'}
    </button>
  )
}
