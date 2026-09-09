import { resolvePortTarget } from '../lib/config.js'
import { writeJson } from '../lib/output.js'
import { scanPorts } from '../lib/scan.js'

export async function isFreeCommand(
  target: string,
  options: { json?: boolean }
): Promise<void> {
  const port = resolvePortTarget(target)
  const occupied = (await scanPorts({ probeHttp: false })).some((entry) => entry.port === port)
  if (options.json) writeJson({ port, free: !occupied })
  else console.log(occupied ? `Port ${port} is occupied` : `Port ${port} is free`)
  process.exitCode = occupied ? 1 : 0
}
