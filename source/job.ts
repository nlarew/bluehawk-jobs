import { hasProperties } from "./util";

export interface Job {
  name: string;
  plugins?: IPluginConfig[];
  sources: ISource[];
  outputs: IOutput[];
  // transformers?: (string | ITransform)[],
}

export const bluehawkJob = <J extends Job>(j: J): Job => j;
export const isBluehawkJob = (j: { [k: string]: any }): j is Job => {
  // Has the right properties
  const hasJobProperties = hasProperties(j, ["name", "sources", "outputs"]);
  // Of the right type
  return hasJobProperties && typeof j.name === "string" && j.sources instanceof Array && j.outputs instanceof Array
};

export interface JobMetadata {
  root: string; // The root directory, i.e. where the .bluehawk config file is located
  startedAt: Date;
}

export const isBluehawkJobMetadata = (meta: { [k: string]: any }): meta is JobMetadata => {
  // Has the right properties
  const hasMetadataProperties = hasProperties(meta, ["root", "startedAt"]);
  // Of the right type
  return hasMetadataProperties && typeof meta.root === "string" && meta.startedAt instanceof Date
};

export interface IPluginConfig {
  name: string;
}

export interface ISource {
  name: string;
}

export interface IOutput {
  name: string;
}
