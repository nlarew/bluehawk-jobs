import { lstatSync, readdirSync, promises as fs } from "fs";
import Path from "path";
import minimatch from "minimatch"
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

export async function run(job: Job, root: string) {
  const rootDir = Path.resolve(root)
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
        // console.log("filesystem handler", parseResult, document)
        if(isFileSystemOutput(output)) {
          const projectDirectory = rootDir
          const directory = Path.join(
            output.path,
            Path.relative(projectDirectory, Path.dirname(document.path))
          );
          const targetPath = Path.join(directory, document.basename);
          console.log({
            projectDirectory,
            directory,
            targetPath,
          })
          console.log(`writing file ${document.path} to ${targetPath}`)
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
    console.log("bh.subscribe", document.path, __dirname);
    handlers.forEach((handler) => {
      handler({ parseResult, document });
    });
  });
  
  console.log("bh: run");
  
  function bushyHack(filenames: string[]): { dirs: string[], ignore: string[] } {
    function relative(root: string, absolutePaths: string[]) {
      return absolutePaths.map(p => Path.relative(root, p)).map(p => `./${p}`)
    }
    // just pass the directory as opposed to specific files
    const dirs = unique(filenames.map(f => Path.dirname(f)))
    // we also need a list of ignored files. filenames doesn't include any ignored files, but we may
    // ignore specific files in directories that we otherwise include so we specify those here. We
    // don't need to ignore anything once bluehawk allows specific absolute path files again.\
    const ignorePaths = new Set<string>()
    for (const source of sources) {
      if(isFileSystemSource(source)) {
        source.ignorePaths?.forEach(i => ignorePaths.add(i))
      }
    }

    const allDirFiles = dirs.flatMap(d => {
      const ls = readdirSync(d)
      const dirFiles = ls.map(p => Path.join(d, p))
      return dirFiles
    })
    const ignore = allDirFiles.filter(f => {
      const isDirectory = lstatSync(f).isDirectory()
      const included = isDirectory ? dirs.includes(f) : filenames.includes(f)
      return !included
    })
    
    return { dirs: relative(rootDir, dirs), ignore: relative(rootDir, ignore) }
  }
  const { dirs, ignore } = bushyHack(filenames)
  console.log({ dirs, ignore })

  await bh.parseAndProcess(dirs, {
    waitForListeners: true,
    onBinaryFile: (file: string) => {
      console.log("onBinaryFile", file)
    },
    onErrors: (file: string, errors: BluehawkError[]) => {
      console.error("onErrors", file, errors)
    },
    ignore: ignore,
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
