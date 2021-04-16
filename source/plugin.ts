import { ISource, IOutput, IPlugin, Context } from "./job";
import { Document, Listener } from "bluehawk";

export type ImplementPlugin<S extends ISource, O extends IOutput> = (context: Context) => IPluginImpl<S, O>;

export const createPlugin = <S extends ISource, O extends IOutput>(fn: ImplementPlugin<S, O>) => fn;

export type Plugins = Record<string, IPluginImpl>; // e.g. { filesystem: { name: "filesystem", source() { ... }, output() { ... } } }

export interface IPluginImpl<
  SourceConfig extends ISource = ISource,
  OutputConfig extends IOutput = IOutput
> {
  name: string;
  source?: (config: SourceConfig) => Document[] | Promise<Document[]>;
  output?: (config: OutputConfig) => Listener | Promise<Listener>;
}
