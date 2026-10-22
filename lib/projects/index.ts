import { placeholderProjects } from "./placeholder";
import type { ProjectsPort } from "./port";

/** The one place that picks the adapter. Swap in the engine adapter here (W1). */
export const projectsPort: ProjectsPort = placeholderProjects;

export type { ProjectCard, ProjectPage, ProjectStatus, ProjectKind } from "./port";
