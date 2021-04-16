import { load } from "./load";
import { run } from "./run";

main().catch(err => {
  console.error(err.message)
})

async function main() {
  const root = "./test";
  for (const job of await load(root)) {
    run(job, root)
  }
}
