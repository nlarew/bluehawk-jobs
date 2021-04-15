import Path from "path";
import { Job, ISource, IOutput, IPlugin, IPluginImpl, Context } from "./job";
import { getBluehawk, Listener, Document } from "bluehawk";
import { unique } from "./util";

type Plugins = Record<string, IPluginImpl>;

export async function run(job: Job, root: string) {
  const bh = await getBluehawk();

  // Set up plugins
  const context: Context = { root: Path.resolve(root) };
  const plugins: Plugins = await setupPlugins(job, context);

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

async function getPluginImpl(
  pluginName: string,
  context: Context
): Promise<IPluginImpl> {
  const { setup } = await import(`./plugins/${pluginName}`);
  if (!setup) {
    throw new Error(`No implementation found for plugin: ${pluginName}`);
  }
  return setup(context);
}

// Returns any plugins in the job config & infers undefined plugins from sources and outputs
function getPlugins(job: Job) {
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

async function setupPlugins(job: Job, context: Context): Promise<Plugins> {
  const plugins = getPlugins(job);
  return Object.fromEntries(
    await Promise.all(
      plugins.map(async (p) => [
        p.name,
        await getPluginImpl(p.name, context),
      ] as [string, IPluginImpl])
    )
  );
}

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
