import { setupProject } from "../utils/project.js";

export async function createProject(projectName, config, installDeps) {
  return await setupProject(projectName, config, installDeps);
}
