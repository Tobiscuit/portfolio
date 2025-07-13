import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { TitledListItem } from '../components/ui/TitledListItem'

export default function About() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 lg:col-span-4 flex justify-center lg:justify-start">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl">
            <Image
              alt="Profile picture"
              className="w-full h-full object-cover"
              src="/profile.png"
              width={256}
              height={256}
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-8 text-center lg:text-left">
          <h1 className="font-serif text-parchment-100">
            A Foundation Built on First Principles.
          </h1>
          <div className="mt-8 space-y-6 text-ink-500 max-w-3xl mx-auto lg:mx-0">
            <p>
              My journey into software development began long before my first line of code. It started with a deep-seated curiosity for how things work, which led me to deconstruct and optimize my own computer's performance. Unsatisfied with out-of-the-box speeds, I took it upon myself to understand the system's inner workings. I learned to carefully edit the registry and deploy specialized tools like Revo Uninstaller and CCleaner, all in the pursuit of peak performance.
            </p>
            <p>
              This passion for understanding systems from the inside out naturally led me to programming in high school. What began with C++ and C# has evolved into a career dedicated to building clean, efficient, and scalable web applications. That early drive for performance and precision still informs every project I take on today.
            </p>
          </div>
          
          <div className="mt-16">
            <h2 className="font-serif text-parchment-100 mb-8">Technical Education & Certifications</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-parchment-100 mb-4">Certifications</h3>
                <div className="space-y-3">
                  <TitledListItem title="AWS Certified Cloud Practitioner" status="Earned" />
                  <TitledListItem title="AWS Solutions Architect Associate" status="Completed Course" />
                  <TitledListItem title="AWS AI Practitioner" status="Completed Course" />
                  <TitledListItem title="CompTIA ITF+" status="Completed Course" />
                  <TitledListItem title="CompTIA A+" status="Completed Course" />
                  <TitledListItem title="CompTIA Network+" status="Completed Course" />
                  <TitledListItem title="CompTIA Security+" status="Completed Course" />
                  <TitledListItem title="CompTIA Cloud+" status="Completed Course" />
                  <TitledListItem title="CompTIA Linux+" status="Completed Course" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-parchment-100 mb-4">Technical Literature</h3>
                <details className="group">
                  <summary className="list-none cursor-pointer text-ink-500 hover:text-parchment-100 transition-colors mb-3 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 transform group-open:rotate-90 transition-transform" />
                    View Complete Reading List
                  </summary>
                  <div className="space-y-3">
                    <TitledListItem title="Fundamentals of Software Architecture" subtitle="Mark Richards & Neal Ford" />
                    <TitledListItem title="Software Architecture: The Hard Parts" subtitle="Mark Richards & Neal Ford" />
                    <TitledListItem title="Acing the System Design Interview" subtitle="Zhiyong Tan" />
                    <TitledListItem title="Grokking Algorithms" subtitle="Aditya Bhargava" />
                    <TitledListItem title="Designing Data-Intensive Applications" subtitle="Martin Kleppmann" />
                    <TitledListItem title="Clean Code" subtitle="Robert C. Martin" />
                    <TitledListItem title="Clean Agile: Back to Basics" subtitle="Robert C. Martin" />
                    <TitledListItem title="The Clean Coder" subtitle="Robert C. Martin" />
                    <TitledListItem title="Clean Architecture" subtitle="Robert C. Martin" />
                    <TitledListItem title="The Product Book" subtitle="Josh Anon, Carlos González de Villaumbrosia" />
                    <TitledListItem title="Executive's Guide to Cloud Computing" subtitle="Eric A. Marks, Bob Lozano" />
                    <TitledListItem title="Networking for Dummies" subtitle="Doug Lowe" />
                    <TitledListItem title="SQL QuickStart Guide" subtitle="Walter Shields" />
                    <TitledListItem title="Design Thinking for Dummies" subtitle="Christian Muller-Roterberg" />
                    <TitledListItem title="Terraform in Action" subtitle="Scott Winkler" />
                    <TitledListItem title="AWS Cloud Architecture Patterns" subtitle="SK Singh" />
                    <TitledListItem title="AWS Cloud Adoption Framework" subtitle="AWS" />
                    <TitledListItem title="Solutions Architect's Handbook" subtitle="Saurabh Shrivastava" />
                    <TitledListItem title="Learn Azure in a Month of Lunches" subtitle="Iain Foulds" />
                    <TitledListItem title="PMP PMBOK 7 Project Management Professional Audio Study Guide" subtitle="2025-2026 Edition" />
                    <TitledListItem title="The DevOps Handbook, Second Edition" subtitle="Gene Kim, Jez Humble, Patrick Debois, John Willis" />
                  </div>
                </details>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center lg:text-left">
            <button type="button" className="inline-flex items-center justify-center px-8 py-3 bg-arcane-gold-500 text-sage-blue-900 font-bold rounded-lg hover:shadow-sm transition-all duration-300">
              Download Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}