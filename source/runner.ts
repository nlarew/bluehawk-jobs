import Path from "path";
import {
  Job,
  Source,
  Output,
  Plugin,
  IPluginImpl,
} from "./job";
import { getBluehawk, Listener, Document } from "bluehawk";

interface PluginContext {
  root: string; // The root directory, i.e. where the .bluehawk config file is located
}

type Plugins = Record<string, IPluginImpl>

async function getPluginImpl(pluginName: string, context: PluginContext): Promise<IPluginImpl> {
  const { plugin } = await import(`./plugins/${pluginName}`)
  if(!plugin) {
    throw new Error(`No implementation found for plugin: ${pluginName}`)
  }
  return plugin(context)
}

async function setupPlugins(plugins: Plugin[], context: PluginContext): Promise<Plugins> {
  const impls = new Map<string, IPluginImpl>()
  for await (const plugin of plugins) {
    if(impls.has(plugin.name)) {
      throw new Error(`Plugin is already registered: ${plugin.name}`)
    }
    impls.set(plugin.name, await getPluginImpl(plugin.name, context));
  }
  return Object.fromEntries(impls)
}

async function getSourceDocuments(plugins: Plugins, sources: Source[]): Promise<Document[]> {
  const documents: Document[] = []
  for await (const source of sources) {
    const impl = plugins[source.name];
    if(!impl.source) {
      throw new Error(`No implementation for source: ${source.name}`)
    }
    documents.push(...await impl.source(source))
  }
  return documents
}

async function getOutputListeners(plugins: Plugins, outputs: Output[]): Promise<Listener[]> {
  const listeners: Listener[] = []
  for await (const output of outputs) {
    const impl = plugins[output.name];
    if(!impl.output) {
      throw new Error(`No implementation for output: ${output.name}`)
    }
    listeners.push(await impl.output(output))
  }
  return listeners
}





export async function run(job: Job, root: string) {
  const bh = await getBluehawk();
  
  // Setup & Validate Plugins
  const pluginContext: PluginContext = { root: Path.resolve(root) }
  const plugins = await setupPlugins(job?.plugins ?? [], pluginContext)
  
  // Outputs
  const outputListeners = await getOutputListeners(plugins, job.outputs);
  bh.subscribe(async ({ parseResult, document }) => {
    outputListeners.forEach((listener) => {
      listener({ parseResult, document });
    });
  });
  
  // Sources
  const sourceDocuments = await getSourceDocuments(plugins, job.sources);
  for await (const sourceDocument of sourceDocuments) {
    const result = bh.parse(sourceDocument)
    if (result.errors.length !== 0) {
      console.error(sourceDocument.path, result.errors);
      return;
    }
    await bh.process(result, {
      waitForListeners: true,
    });
  }
}

// export async function run0(job: Job, root: string) {
//   const rootDir = Path.resolve(root)
//   const githubPluginPath = Path.resolve("bluehawk-plugin-github")
//   console.log({ rootDir, githubPluginPath })
//   const { sources, outputs } = job;
//   // Sources
//   const filenames = await getFilenamesFromSources(sources);
//   console.log("filenames", filenames);
  
//   // Outputs
//   const outputHandler = (output: Output): Listener => {
//     // Get some instance of the output plugin
//     // TODO: Make this more robust and plugin-y
//     const handler: Listener | undefined = ({
//       filesystem: async ({ parseResult, document }: ProcessResult) => {
//         // console.log("filesystem handler", parseResult, document)
//         if(isFilesystemOutput(output)) {
//           const projectDirectory = rootDir
//           const directory = Path.join(
//             output.path,
//             Path.relative(projectDirectory, Path.dirname(document.path))
//           );
//           const targetPath = Path.join(directory, document.basename);
//           console.log(`\nwriting file ${document.path} to ${targetPath}`)
//           console.log({
//             projectDirectory,
//             directory,
//             targetPath,
//             absoluteTargetPath: Path.join(projectDirectory, targetPath)
//           })
//           await fs.mkdir(directory, { recursive: true });
//           await fs.writeFile(targetPath, document.text.toString(), "utf8");
//         }
//       }
//     })[output.name]
//     if(!handler) {
//       throw new Error(`No handler for output: ${output.name}`)
//     }
    
//     return handler
//   }
//   const handlers = outputs.map((output) => outputHandler(output));
  
//   // Bluehawk
//   console.log("bh: configure");
  
//   const bh = await getBluehawk();
//   bh.subscribe(async ({ parseResult, document }) => {
//     handlers.forEach((handler) => {
//       handler({ parseResult, document });
//     });
//   });
  
//   console.log("bh: run");
  
  // function bushyHack(filenames: string[]): { dirs: string[], ignore: string[] } {
  //   function relative(root: string, absolutePaths: string[]) {
  //     return absolutePaths.map(p => Path.relative(root, p)).map(p => `./${p}`)
  //   }
  //   // just pass the directory as opposed to specific files
  //   const dirs = unique(filenames.map(f => Path.dirname(f)))
  //   // we also need a list of ignored files. filenames doesn't include any ignored files, but we may
  //   // ignore specific files in directories that we otherwise include so we specify those here. We
  //   // don't need to ignore anything once bluehawk allows specific absolute path files again.\
  //   const allDirFiles = dirs.flatMap(d => {
  //     const ls = readdirSync(d)
  //     const dirFiles = ls.map(p => Path.join(d, p))
  //     return dirFiles
  //   })
  //   const ignore = allDirFiles.filter(f => {
  //     const isDirectory = lstatSync(f).isDirectory()
  //     const included = isDirectory ? dirs.includes(f) : filenames.includes(f)
  //     return !included
  //   })
    
  //   return {
  //     dirs: relative(rootDir, dirs),
  //     ignore: ignore.map(p => Path.basename(p)) //relative(rootDir, ignore)
  //   }
  // }
  // const { dirs, ignore } = bushyHack(filenames)
  // console.log({ dirs, ignore })

  // await bh.parseAndProcess(dirs, {
  //   waitForListeners: true,
  //   ignore: ignore,
  // });
  // onBinaryFile: (file: string) => {
  //   console.log("onBinaryFile", file)
  // },
  // onErrors: (file: string, errors: BluehawkError[]) => {
  //   console.error("onErrors", file, errors)
  // },
  // console.log("bh: done");
// }

// function unique<T>(arr: T[]): T[] {
//   return [...new Set(arr)];
// }

// async function getUniqueFilenames(
//   promises: Promise<string[]>[]
// ): Promise<string[]> {
//   const allSettledResults = await Promise.allSettled(promises);
//   const { fulfilled } = splitPromiseSettledResults(allSettledResults);
//   const filenames = unique(fulfilled.flatMap((r) => r.value).flat());
//   return filenames;
// }

// async function getFilenamesFromSources(sources: Source[]): Promise<string[]> {
//   return getUniqueFilenames(sources.map(s => getFilenamesFromSource(s)));
// }

// async function getFilenamesFromSource(source: Source): Promise<string[]> {
//   if (isFilesystemSource(source)) {
//     return getUniqueFilenames(
//       source.paths.map((path) => getFilenamesFromPath(path, source.ignorePaths))
//     );
//   } else {
//     throw new Error("Unknown source");
//   }
// }

// async function getFilenamesFromPath(path: string, ignorePaths?: string[]) {
//   const matches = await glob(path, { ignore: ignorePaths, nodir: true });
//   return unique(matches.map((path) => Path.resolve(path)));
// }
