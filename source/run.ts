import { Job, ISource, IOutput, JobMetadata, IPluginConfig } from "./job";
import { importPlugin, IPluginImpl } from "./plugin";
import { getBluehawk, Listener, Document } from "bluehawk";
import { unique } from "./util";
import { Plugins, Context } from "./plugin";

interface RunConfig {
  job: Job;
  meta: JobMetadata;
}

export async function run({ job, meta }: RunConfig) {
  const bh = await getBluehawk();

  // Set up plugins
  const plugins: Plugins = await getPlugins(job, meta);

  // Add a listener for each output
  const outputListeners = await getOutputListeners(plugins, job.outputs);
  bh.subscribe(async ({ parseResult, document }) => {
    outputListeners.forEach((listener) => {
      listener({ parseResult, document });
    });
  });

  // Get documents from each source and process them
  const sourceDocuments = await getSourceDocuments(plugins, job.sources);
  for await (const sourceDocument of sourceDocuments) {
    const result = bh.parse(sourceDocument);
    if (result.errors.length !== 0) {
      console.error(sourceDocument.path, result.errors);
      return;
    }
    await bh.process(result, {
      waitForListeners: true,
    });
  }
}

// Get implementations for each required plugin
async function getPlugins(job: Job, meta: JobMetadata): Promise<Plugins> {
  const plugins = inferPlugins(job);
  return Object.fromEntries(
    await Promise.all(
      plugins.map(
        async (plugin) =>
          [plugin.name, await getPluginImpl({ config: plugin, meta })] as [
            string,
            IPluginImpl
          ]
      )
    )
  );
}

// Returns plugins defined in the job config and/or inferred from sources and outputs
function inferPlugins(job: Job) {
  const { plugins = [], sources, outputs } = job;
  const sourcePluginNames = sources.map((s) => s.name);
  const outputPluginNames = outputs.map((o) => o.name);
  for (const pluginName of unique([
    ...sourcePluginNames,
    ...outputPluginNames,
  ])) {
    if (!plugins.find((p) => p.name === pluginName)) {
      plugins.push({ name: pluginName });
    }
  }
  return plugins;
}

// Returns an implementation of a plugin instantiated with the current context
async function getPluginImpl({
  config,
  meta,
}: Context<IPluginConfig>): Promise<IPluginImpl> {
  const { setup } = await importPlugin(config.name);
  if (!setup) {
    throw new Error(`No implementation found for plugin: ${config.name}`);
  }
  return setup({ config, meta });
}

// Get Bluehawk Documents from every source
async function getSourceDocuments(
  plugins: Plugins,
  sources: ISource[]
): Promise<Document[]> {
  const documents: Document[] = [];
  for await (const source of sources) {
    const impl = plugins[source.name];
    if (!impl.source) {
      throw new Error(`No implementation for source: ${source.name}`);
    }
    documents.push(...(await impl.source(source)));
  }
  return documents;
}

// Get a Bluehawk Listener for each output
async function getOutputListeners(
  plugins: Plugins,
  outputs: IOutput[]
): Promise<Listener[]> {
  const listeners: Listener[] = [];
  for await (const output of outputs) {
    const impl = plugins[output.name];
    if (!impl.output) {
      throw new Error(`No implementation for output: ${output.name}`);
    }
    listeners.push(await impl.output(output));
  }
  return listeners;
}
