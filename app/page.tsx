import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-6 text-center md:text-left">
          <h1 className="font-serif">
            Code That Scales
          </h1>
          <p className="mt-4 text-ink-500 max-w-lg mx-auto md:mx-0">
            Full-stack developer building robust, scalable applications with modern technologies and clean architecture.
          </p>
          <Link
            href="/projects"
            className="mt-8 inline-flex items-center justify-center px-8 py-3 bg-arcane-gold-500 text-sage-blue-900 font-bold rounded-lg hover:shadow-sm transition-all duration-300"
          >
            View Projects
          </Link>
        </div>
        <div className="md:col-span-6">
          <div className="aspect-square rounded-lg overflow-hidden shadow-2xl">
            <Image
              alt="Abstract representation of cloud architecture and security"
              className="w-full h-full object-cover"
              src="/abstract-profile.png"
              width={600}
              height={600}
            />
          </div>
        </div>
      </div>
    </div>
  )
}