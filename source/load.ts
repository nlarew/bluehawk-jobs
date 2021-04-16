import Path from "path"
import { promises as fs } from "fs"
import { isBluehawkJob, Job } from "./job"

export async function load(path: string): Promise<Job[]> {
  const stats = await fs.lstat(path);
  if(stats.isDirectory()) {
    return await loadDirectory(path)
  } else {
    return [await loadFile(path)]
  }
}

async function loadFile(path: string): Promise<Job> {
  // Check that this is a **.bluehawk.json
  const isBluehawkConfig = true
  if(!isBluehawkConfig) {
    throw new Error(`Invalid config path: ${path}`)
  }
  // Read the file & return it as a Job
  const file = await fs.readFile(path, { encoding: "utf8" })
  const job = JSON.parse(file)
  if(!isBluehawkJob(job)) {
    throw new Error(`Invalid config: ${path}`)
  }
  return job
}

async function loadDirectory(dirPath: string): Promise<Job[]> {
  // Find all **.bluehawk.json
  const filesInDirectory = await fs.readdir(dirPath)
  const configPaths: string[] = filesInDirectory.filter(p => p.match(/.*\.bluehawk\.json/)).map(fileName => Path.join(dirPath, fileName))
  const jobs: Job[] = [];
  for (const configPath of configPaths) {
    jobs.push(await loadFile(configPath))
  }
  return jobs
}
