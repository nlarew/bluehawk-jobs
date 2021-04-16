import Path from "path";
import { readFileSync, promises as fs } from "fs";
import { ISource, IOutput, IPluginImpl, IPlugin } from "../../job";
import { glob, splitPromiseSettledResults, unique } from "../../util";
import { Document } from "bluehawk";

export interface FilesystemPlugin extends IPlugin {
  name: "filesystem";
}

export interface FilesystemSource extends ISource {
  name: "filesystem";
  paths: string[];
  ignorePaths?: string[];
}

export interface FilesystemOutput extends IOutput {
  name: "filesystem";
  path: string;
}

export const setup = (context: {
  root: string;
}): IPluginImpl<FilesystemSource, FilesystemOutput> => ({
  name: "filesystem",
  source: async (source: FilesystemSource) => {
    const filenames = await getUniqueFilenames(
      source.paths.map((path) =>
        getFilenames(Path.resolve(context.root, path), source.ignorePaths)
      )
    );
    const documents: Document[] = filenames.map((filename) => {
      const blob = readFileSync(Path.resolve(filename));
      // if (isBinary(filename, blob)) {
      //   onBinaryFile && (await onBinaryFile(filename));
      //   return;
      // }
      const text = blob.toString("utf8");
      return new Document({ text, path: filename });
    });
    return documents;
  },
  output: (output: FilesystemOutput) => {
    return async ({ parseResult, document }) => {
      const relativeDirectory = Path.join(
        output.path,
        Path.relative(context.root, Path.dirname(document.path))
      );
      const directory = Path.join(context.root, relativeDirectory)
      const relativeTargetPath = Path.join(relativeDirectory, document.basename);
      const targetPath = Path.join(context.root, relativeTargetPath);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(targetPath, document.text.toString(), "utf8");
    };
  },
});

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
