'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SuspenseImage, SuspenseSvg } from '@/app/components/ui/SuspenseImage'
import ImageModal from '@/app/components/ImageModal'

type CaseStudySection = {
  title: string;
  text: string;
  image?: string;
  imageAlt?: string;
  list?: string[];
}

type CaseStudy = {
  intro: CaseStudySection;
  sections: CaseStudySection[];
  conclusion: { title: string; text: string; };
  futureWork?: { title:string; intro: string; points: { title: string; text: string }[] };
  finalArchitecture?: { title: string; text: string; image: string; imageAlt: string; };
}

type Project = {
  id: number;
  title: string;
  description: string;
  features: string[];
  tech: string[];
  image?: string;
  url?: string;
  caseStudy?: CaseStudy;
}

export default function ProjectDetailsView({ project }: { project: Project }) {
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const openModal = (imageUrl: string) => setModalImageUrl(imageUrl);
  const closeModal = () => setModalImageUrl(null);

  // Unified image renderer that handles both SVG and raster images
  const renderImage = (src: string, alt: string, onClick?: () => void) => {
    const isSvg = src.endsWith('.svg');
    
    if (isSvg) {
      return (
        <SuspenseSvg
          src={src}
          alt={alt}
          className="rounded-lg my-6 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onClick}
        />
      );
    }
    
    return (
      <SuspenseImage
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className="w-full h-auto rounded-lg my-6 cursor-pointer hover:opacity-90 transition-opacity"
        aspectRatio="3/2"
        onClick={onClick}
      />
    );
  };

  return (
    <>
      <div className="min-h-screen bg-sage-blue-900">
        <div className="container mx-auto px-4 py-12 md:px-8">
          <header className="mb-8">
            <Link href="/projects" className="text-sm text-arcane-gold-500 hover:underline flex items-center gap-2 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to Projects
            </Link>
            <h1 className="font-serif text-5xl text-parchment-100 mb-2">{project.title}</h1>
            <p className="text-ink-500 text-lg">{project.description}</p>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="aspect-w-16 aspect-h-9 rounded-lg bg-ink-900 mb-8 overflow-hidden">
                {project.image ? (
                  project.url ? (
                    <Link href={project.url} target="_blank" rel="noopener noreferrer">
                      <SuspenseImage
                        src={project.image}
                        alt={`Screenshot of ${project.title}`}
                        width={1920}
                        height={1080}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        aspectRatio="16/9"
                      />
                    </Link>
                  ) : (
                    <SuspenseImage
                      src={project.image}
                      alt={`Screenshot of ${project.title}`}
                      width={1920}
                      height={1080}
                      className="w-full h-full object-cover"
                      aspectRatio="16/9"
                    />
                  )
                ) : (
                  project.url ? (
                    <Link href={project.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <div className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity" style={{
                        backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
                        backgroundSize: `16px 16px`,
                      }}></div>
                    </Link>
                  ) : (
                    <div className="w-full h-full" style={{
                      backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
                      backgroundSize: `16px 16px`,
                    }}></div>
                  )
                )}
              </div>

              <div className="lg:hidden mb-8">
                <h4 className="font-bold text-parchment-200 mb-2">Technologies Used</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map(tech => (
                    <span key={tech} className="bg-ink-700 text-parchment-200 text-sm font-medium px-2.5 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="prose prose-lg prose-invert text-parchment-300 max-w-none space-y-6 prose-p:leading-relaxed">
                {(() => {
                  if (!project.caseStudy) {
                    return <p>A detailed case study for this project is coming soon.</p>;
                  }
                  
                  const { caseStudy } = project;

                  return (
                    <>
                      {/* Intro */}
                      <h2 className="font-serif text-3xl text-parchment-100 mb-4">{caseStudy.intro.title}</h2>
                      <p dangerouslySetInnerHTML={{ __html: caseStudy.intro.text }} />
                      {caseStudy.intro.image && (
                        <button onClick={() => openModal(caseStudy.intro.image!)} className="w-full block">
                          {renderImage(caseStudy.intro.image, caseStudy.intro.imageAlt || '')}
                        </button>
                      )}

                      {/* Sections */}
                      {caseStudy.sections.map((section, index) => (
                        <div key={index}>
                          <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">{section.title}</h2>
                          <p dangerouslySetInnerHTML={{ __html: section.text }} />
                          {section.list && (
                            <ol className="list-decimal pl-5 space-y-2">
                              {section.list.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
                            </ol>
                          )}
                          {section.image && (
                            <button onClick={() => openModal(section.image!)} className="w-full block">
                              {renderImage(section.image, section.imageAlt || '')}
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Conclusion */}
                      <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">{caseStudy.conclusion.title}</h2>
                      <p dangerouslySetInnerHTML={{ __html: caseStudy.conclusion.text }} />

                      {/* Future Work - Only render if it exists */}
                      {caseStudy.futureWork && (
                        <>
                          <h2 className="font-serif text-3xl text-parchment-100 mt-8 mb-4">{caseStudy.futureWork.title}</h2>
                          <p dangerouslySetInnerHTML={{ __html: caseStudy.futureWork.intro }} />
                          <ul className="list-disc pl-5 space-y-2">
                            {caseStudy.futureWork.points.map((point, i) => (
                              <li key={i}>
                                <strong>{point.title}:</strong> <span dangerouslySetInnerHTML={{ __html: point.text }} />
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      
                      {/* Final Architecture - Only render if it exists */}
                      {caseStudy.finalArchitecture && (
                        <>
                          <h2 className="font-serif text-3xl text-parchment-100 mt-8 mb-4">{caseStudy.finalArchitecture.title}</h2>
                          <p dangerouslySetInnerHTML={{ __html: caseStudy.finalArchitecture.text }} />
                          <p>The final cloud architecture I deployed is as follows:</p>
                          <button onClick={() => openModal(caseStudy.finalArchitecture!.image)} className="w-full block">
                            {renderImage(caseStudy.finalArchitecture.image, caseStudy.finalArchitecture.imageAlt)}
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            
            <aside>
              <div className="sticky top-24 bg-ink-900/50 p-6 rounded-lg">
                <h3 className="hidden lg:block font-serif text-2xl text-parchment-100 mb-4">Key Information</h3>
                
                <div className="text-center">
                  <h4 className="font-bold text-parchment-200 mb-3">Key Features</h4>
                  <ul className="inline-block list-disc text-left space-y-1">
                    {project.features.map(feature => <li key={feature}>{feature}</li>)}
                  </ul>
                </div>

                <div className="hidden lg:block mt-6">
                  <h4 className="font-bold text-parchment-200 mb-3 text-center">Technologies Used</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {project.tech.map(tech => (
                      <span key={tech} className="bg-ink-700 text-parchment-200 text-sm font-medium px-2.5 py-1 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>
        <ImageModal imageUrl={modalImageUrl} onClose={closeModal} />
      </div>
    </>
  )
}