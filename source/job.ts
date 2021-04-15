import { hasProperties } from "./util"
import { Document, Listener } from 'bluehawk'

export interface Job {
  name: string,
  plugins?: IPlugin[],
  sources: ISource[],
  outputs: IOutput[],
  // languages?: (string | ILanguage)[],
  // transformers?: (string | ITransform)[],
}

export const bluehawkJob = <J extends Job>(j: J): Job => j

export interface Context {
  root: string; // The root directory, i.e. where the .bluehawk config file is located
}

export interface IPlugin {
  name: string
}

export interface ISource {
  name: string
}

export interface IOutput {
  name: string
}

export interface IPluginImpl<
  SourceConfig extends ISource = ISource,
  OutputConfig extends IOutput = IOutput,
> {
  name: string
  source?: (config: SourceConfig) => Document[] | Promise<Document[]>
  output?: (config: OutputConfig) => Listener | Promise<Listener>
}
