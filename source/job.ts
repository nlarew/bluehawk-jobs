import { hasProperties } from "./util";
import { Document, Listener } from "bluehawk";

export interface Job {
  name: string;
  plugins?: IPlugin[];
  sources: ISource[];
  outputs: IOutput[];
  // languages?: (string | ILanguage)[],
  // transformers?: (string | ITransform)[],
}

export const bluehawkJob = <J extends Job>(j: J): Job => j;
export const isBluehawkJob = (j: { [k: string]: any }): j is Job => {
  // Has the right properties
  const hasJobProperties = hasProperties(j, ["name", "sources", "outputs"]);
  // Of the right type
  return hasJobProperties && typeof j.name === "string" && j.sources instanceof Array && j.outputs instanceof Array
};

export interface Context {
  root: string; // The root directory, i.e. where the .bluehawk config file is located
}

export interface IPlugin {
  name: string;
}

export interface ISource {
  name: string;
}

export interface IOutput {
  name: string;
}
