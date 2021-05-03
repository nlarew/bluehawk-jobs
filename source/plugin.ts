import {
  ISource,
  IOutput,
  Context,
  IPluginConfig,
} from "./job";
import { Document, Listener } from "bluehawk";

export interface IPlugin<
  Config extends IPluginConfig = IPluginConfig,
  Source extends ISource = ISource,
  Output extends IOutput = IOutput
> {
  setup: ImplementPlugin<Config, Source, Output>;
}

type ImplementPlugin<
  Config extends IPluginConfig,
  Source extends ISource,
  Output extends IOutput
> = (context: Context<Config>) => IPluginImpl<Source, Output>;

export interface IPluginImpl<
  SourceConfig extends ISource = ISource,
  OutputConfig extends IOutput = IOutput
> {
  name: string;
  source?: (config: SourceConfig) => Document[] | Promise<Document[]>;
  output?: (config: OutputConfig) => Listener | Promise<Listener>;
}

export type Plugins = Record<string, IPluginImpl>;

export function createPlugin<
  Config extends IPluginConfig,
  Source extends ISource,
  Output extends IOutput
>(setup: ImplementPlugin<Config, Source, Output>) {
  return setup;
}

export async function importPlugin<
  Config extends IPluginConfig,
  Source extends ISource,
  Output extends IOutput
>(name: string) {
  const plugin: IPlugin<Config, Source, Output> = await import(
    `./plugins/${name}`
  );
  return plugin;
}
