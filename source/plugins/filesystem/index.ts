import Path from "path";
import { readFileSync, promises as fs } from "fs";
import {
  IPlugin,
  Plugin,
  FilesystemPlugin,
  FilesystemSource,
  FilesystemOutput,
} from "../../job";
import { glob, splitPromiseSettledResults } from "../../util";
import { Listener, Document } from "bluehawk";
import { ProcessResult } from "bluehawk/build/src/bluehawk/processor/Processor";

const listener = <T extends Listener>(t: T): Listener => t; 

export const plugin = (context: { root: string }) => ({
  name: "filesystem",
  validate: (config: IPlugin) => {
    return true;
  },
  source: async (source: FilesystemSource) => {
    const filenames = await getUniqueFilenames(
      source.paths.map((path) => getFilenames(path, source.ignorePaths))
    );
    const documents: Document[] = filenames.map(filename => {
      const blob = readFileSync(Path.resolve(filename));
      // if (isBinary(filename, blob)) {
      //   onBinaryFile && (await onBinaryFile(filename));
      //   return;
      // }
      const text = blob.toString("utf8");
      return new Document({ text, path: filename })
    })
    return documents
  },
  output: (output: FilesystemOutput) => {
    return listener(async ({ parseResult, document }: ProcessResult) => {
      const directory = Path.join(
        output.path,
        Path.relative(context.root, Path.dirname(document.path))
      );
      const targetPath = Path.join(directory, document.basename);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(targetPath, document.text.toString(), "utf8");
    });
  },
});

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

async function getFilenames(path: string, ignorePaths?: string[]) {
  const matches = await glob(path, { ignore: ignorePaths, nodir: true });
  return unique(matches.map((path) => Path.resolve(path)));
}