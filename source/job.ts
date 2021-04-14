import { hasProperties } from "./util"
import { Document, Listener } from 'bluehawk'

export interface Job {
  name: string,
  plugins?: Plugin[],
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

export type RegisterPlugin<PluginConfig extends IPlugin = IPlugin> = (config: PluginConfig) => void | Promise<void> // e.g. make sure you have a valid github token for the repo before we run the job
export type ValidateFunction<PluginConfig extends IPlugin = IPlugin> = (config: PluginConfig) => boolean | Promise<boolean> // e.g. make sure you have a valid github token for the repo before we run the job
export type SourceFunction<SourceConfig extends ISource = ISource> = (config: SourceConfig) => Document[] | Promise<Document[]>
export type OutputFunction<OutputConfig extends IOutput = IOutput> = (config: OutputConfig) => Listener | Promise<Listener>

export interface IPluginImpl {
  name: string
  register: RegisterPlugin
  validate?: ValidateFunction
  source?: SourceFunction
  output?: OutputFunction
}

export type Plugin = FilesystemPlugin | IPlugin
export interface FilesystemPlugin extends IPlugin {
  name: "filesystem";
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

export const filesystemSource = <S extends FilesystemSource>(s: S): FilesystemSource => s

export const isFilesystemSource = (s: ISource): s is FilesystemSource => {
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

export const filesystemOutput = <S extends FilesystemOutput>(s: S): FilesystemOutput => s

export const isFilesystemOutput = (o: IOutput): o is FilesystemOutput => {
  return o.name === "filesystem" && hasProperties<FilesystemOutput>(o, ["path"])
}
