import { ISource, IOutput, IPlugin } from "../../job";
import { Document } from "bluehawk";
import { createPlugin } from "../../plugin";

export interface GitHubPlugin extends IPlugin {
  name: "github";
}

interface GitHubRepo {
  organization: string;
  repo: string;
  branch?: string;
}

export interface GitHubSource extends GitHubRepo, ISource {
  name: "github";
  // Repo file tree
  paths: string[];
  ignorePaths?: string[];
}

export interface GitHubOutput extends GitHubRepo, IOutput {
  name: "github";
  strategy: "commit" | "overwrite" | "pr" // instead of "deleteEverything: boolean" we can pick from a set of strategies
  // localRepo: string;
  // Repo file tree
  path: string;
  branch?: string;
  mapStateToBranch?: {
    [state: string]: string;
  }
}

export const setup = createPlugin<GitHubSource, GitHubOutput>(context => ({
  name: "github",
  source: async (source) => {
    const documents: Document[] = []
    // TODO
    return documents
  },
  output: (output) => {
    return async ({ parseResult, document }) => {
      // TODO
    };
  },
}));
