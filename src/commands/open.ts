import open from 'open'
import { resolvePortTarget } from '../lib/config.js'
import { scanPorts } from '../lib/scan.js'

export async function openCommand(target: string): Promise<void> {
  const port = resolvePortTarget(target)
  const entry = (await scanPorts()).find((candidate) => candidate.port === port)
  if (!entry) throw new Error(`Port ${port} is free`)
  const url = entry.http?.reachable ? entry.http.url : `http://localhost:${port}`
  await open(url)
  console.log(`Opened ${url}`)
}
