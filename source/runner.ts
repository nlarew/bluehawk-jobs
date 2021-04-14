import { promises as fs } from "fs";
import Path from "path";
import {
  Job,
  Source,
  isFileSystemSource,
  isFileSystemOutput,
  Output,
} from "./job";
import { getBluehawk, Listener, ParseResult } from "bluehawk";
import { glob, splitPromiseSettledResults } from "./util";
import { BluehawkError } from "bluehawk/build/src/bluehawk/BluehawkError";
import { ProcessResult } from "bluehawk/build/src/bluehawk/processor/Processor";

export async function run(job: Job) {
  const { sources, outputs } = job;
  // Sources
  const filenames = await getFilenamesFromSources(sources);
  console.log("filenames", filenames);
  
  // Outputs
  const outputHandler = (output: Output): Listener => {
    // Get some instance of the output plugin
    // TODO: Make this more robust and plugin-y
    const handler: Listener | undefined = ({
      filesystem: async ({ parseResult, document }: ProcessResult) => {
        console.log("filesystem handler", parseResult, document)
        if(isFileSystemOutput(output)) {
          const projectDirectory = __dirname
          const directory = Path.join(
            output.path,
            Path.relative(projectDirectory, Path.dirname(document.path))
          );
          const targetPath = Path.join(directory, document.basename);
          console.log(`writing to ${targetPath} from ${directory}.${document.basename}`)
          await fs.writeFile(targetPath, document.text.toString(), "utf8");
        }
      }
    })[output.name]
    if(!handler) {
      throw new Error(`No handler for output: ${output.name}`)
    }
    
    return handler
  }
  const handlers = outputs.map((output) => outputHandler(output));
  
  // Bluehawk
  console.log("bh: configure");
  
  const bh = await getBluehawk();
  bh.subscribe(async ({ parseResult, document }) => {
    console.log("bh.subscribe", { parseResult, document });
    handlers.forEach((handler) => {
      handler({ parseResult, document });
    });
  });
  
  console.log("bh: run");
  
  await bh.parseAndProcess(filenames, {
    waitForListeners: true,
    onBinaryFile: (file: string) => {
      console.log("onBinaryFile", file)
    },
    onErrors: (file: string, errors: BluehawkError[]) => {
      console.error("onErrors", file, errors)
    },
    ignore: [],
  });
  console.log("bh: done");
}

// function getSourceProcessor(sourceName: string) {
//   // TODO: Look up the plugin from a registry, in node_modules, etc
//   // TODO: Call the plugin's source() method with the ISource config
// }



function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function getUniqueFilenames(
  promises: Promise<string[]>[]
): Promise<string[]> {
  const allSettledResults = await Promise.allSettled(promises);
  const { fulfilled } = splitPromiseSettledResults(allSettledResults);
  const filenames = unique(fulfilled.flatMap((r) => r.value).flat());
  return filenames;
}

async function getFilenamesFromSources(sources: Source[]): Promise<string[]> {
  return getUniqueFilenames(sources.map(s => getFilenamesFromSource(s)));
}

async function getFilenamesFromSource(source: Source): Promise<string[]> {
  if (isFileSystemSource(source)) {
    return getUniqueFilenames(
      source.paths.map((path) => getFilenamesFromPath(path, source.ignorePaths))
    );
  } else {
    throw new Error("Unknown source");
  }
}

async function getFilenamesFromPath(path: string, ignorePaths?: string[]) {
  const matches = await glob(path, { ignore: ignorePaths, nodir: true });
  return unique(matches.map((path) => Path.resolve(path)));
}
