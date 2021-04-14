import { bluehawkJob } from "./job";
import { run } from "./runner";

const job = bluehawkJob({
  name: "Realm Examples (JS/TS)",
  plugins: ["filesystem", "github"],
  sources: [
    {
      name: "filesystem",
      paths: [
        "./foobar/**",
        // "./source/**"
      ],
      // paths: ["./**"],
      ignorePaths: ["./**/node_modules/**", "./**/build/**", "./**/foobar/nested/notme.js"]
    },
    // {
    //   name: "filesystem",
    //   paths: ["./**"],
    //   ignorePaths: ["./node_modules/**", "./build/**"]
    // },
  ],
  outputs: [
    {
      name: "filesystem",
      path: "./output",
    },
  ],
});

run(job, `${__dirname}/..`);
