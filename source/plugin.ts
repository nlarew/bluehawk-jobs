import {
  ISource,
  IOutput,
  IContext,
  JobMetadata,
  IPluginConfig,
  Job,
} from "./job";
import { Document, Listener } from "bluehawk";

export type CreatePluginContext<C extends IContext> = (meta: JobMetadata) => C;
export type ImplementPlugin<
  C extends IContext,
  S extends ISource,
  O extends IOutput
> = (context: C) => IPluginImpl<S, O>;

export const createPlugin = <
  C extends IContext,
  S extends ISource,
  O extends IOutput
>(
  fn: ImplementPlugin<C, S, O>
) => fn;

export type Plugins = Record<string, IPluginImpl>; // e.g. { filesystem: { name: "filesystem", source() { ... }, output() { ... } } }

export interface IPlugin<
  PluginConfig extends IPluginConfig = IPluginConfig,
  Context extends IContext = IContext,
  SourceConfig extends ISource = ISource,
  OutputConfig extends IOutput = IOutput
> {
  createContext(inputs: { config: PluginConfig; meta: JobMetadata }): Context;
  setup: ImplementPlugin<Context, SourceConfig, OutputConfig>;
}

export async function importPlugin<
  P extends IPluginConfig = IPluginConfig,
  C extends IContext = IContext,
  S extends ISource = ISource,
  O extends IOutput = IOutput
>(name: string) {
  const plugin: IPlugin<P, C, S, O> = await import(`./plugins/${name}`);
  return plugin;
}

export interface IPluginImpl<
  SourceConfig extends ISource = ISource,
  OutputConfig extends IOutput = IOutput
> {
  name: string;
  source?: (config: SourceConfig) => Document[] | Promise<Document[]>;
  output?: (config: OutputConfig) => Listener | Promise<Listener>;
}
