import { hasProperties } from "./util"

export interface Job {
  name: string,
  plugins?: (string | IPlugin)[],
  sources: Source[],
  outputs: Output[],
  // languages?: (string | ILanguage)[],
  // transformers?: (string | ITransform)[],
}

export const bluehawkJob = <J extends Job>(j: J): Job => j

// Plugins
export interface IPlugin {
  name: string
}

// Sources
export interface ISource {
  name: string
}

export type Source = FilesystemSource | ISource

export interface FilesystemSource extends ISource {
  name: "filesystem";
  paths: string[];
  ignorePaths?: string[];
}

export const fileSystemSource = <S extends FilesystemSource>(s: S): FilesystemSource => s

export const isFileSystemSource = (s: ISource): s is FilesystemSource => {
  return s.name === "filesystem" && hasProperties<FilesystemSource>(s, ["paths"])
}

// Outputs
export interface IOutput {
  name: string
}

export type Output = FilesystemOutput | IOutput

export interface FilesystemOutput extends IOutput {
  name: "filesystem";
  path: string;
}

export const fileSystemOutput = <S extends FilesystemOutput>(s: S): FilesystemOutput => s

export const isFileSystemOutput = (o: IOutput): o is FilesystemOutput => {
  return o.name === "filesystem" && hasProperties<FilesystemOutput>(o, ["path"])
}
