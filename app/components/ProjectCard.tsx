import Link from 'next/link';

type Project = {
  id: number;
  title: string;
  description: string;
};

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <div className="flex flex-col gap-4">
        <div className="aspect-w-16 aspect-h-9 overflow-hidden rounded-lg ant-trail">
          <div className="w-full h-full bg-ink-900" style={{
            backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
            backgroundSize: `12px 12px`,
          }}>
          </div>
        </div>
        <div>
          <h4 className="font-serif text-parchment-100 group-hover:text-arcane-gold-500 transition-colors">
            {project.title}
          </h4>
          <p className="text-sm text-ink-500 mt-1">
            {project.description}
          </p>
        </div>
      </div>
    </Link>
  );
} 