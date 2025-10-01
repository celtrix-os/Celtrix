import { setupProject } from "../utils/project.js";
import { executeStackSetup } from "./command.js";

export async function createProject(projectName, config) {
    // Check if stack supports command-based setup
  const commandBasedStacks = ['django-react', 'django-vue', 'django-angular'];
  
  if (commandBasedStacks.includes(config.stack)) {
    // New command-based approach
    return await executeStackSetup(projectName, config);
  } else {
    // Legacy template-based approach
    return await setupProject(projectName, config);
  }
}
