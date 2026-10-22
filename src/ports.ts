import { supports030 } from "../lib/kit-030/types";
import { engineProfileLinks, staticProfileLinks, type ProfileLinksPort } from "../lib/profile-links";
import { engineProjects } from "../lib/projects/engine";
import { placeholderProjects } from "../lib/projects/placeholder";
import type { ProjectsPort } from "../lib/projects/port";

/**
 * The composition root (spec 003, domain-model section 3): the one place
 * that decides which adapter answers each port. Pages receive the ports and
 * never choose. The engine adapters only when the kit client can ask for
 * spec 030's data (`contentModel`, kit 0.8.0); the data module otherwise,
 * which is kit 0.6.2 today. Each engine adapter also falls back to the data
 * module at runtime when the engine cannot serve (no model, a failed call).
 */
export interface Ports {
  projects: ProjectsPort;
  profileLinks: ProfileLinksPort;
}

export function portsFor(client: unknown): Ports {
  if (!supports030(client)) return { projects: placeholderProjects, profileLinks: staticProfileLinks };
  return {
    projects: engineProjects(client, placeholderProjects),
    profileLinks: engineProfileLinks(client, staticProfileLinks),
  };
}
