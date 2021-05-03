import Path from "path";
import { JobMetadata } from "./job";
import { load } from "./load";
import { run } from "./run";

main().catch((err) => {
  console.error(err.message);
});

const metadata = <Meta extends JobMetadata>(meta: Meta): JobMetadata => meta;

async function main() {
  const root = "./test";
  for (const job of await load(root)) {
    const meta = metadata({
      root: Path.resolve(root),
      startedAt: new Date(),
    });
    run({ job, meta });
  }
}
