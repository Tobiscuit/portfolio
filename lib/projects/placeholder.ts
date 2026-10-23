import { WORK } from "../../content/work";
import type { ProjectsPort } from "./port";

/**
 * The adapter until engine spec 030 (tasks W1): the static summaries in
 * content/work.ts, and no project pages.
 */
export const placeholderProjects: ProjectsPort = {
  async list() {
    return WORK;
  },
  async get() {
    return null;
  },
};
