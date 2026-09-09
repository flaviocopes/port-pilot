import chalk from 'chalk'
import { filterPorts } from '../lib/filters.js'
import { formatMemory, formatUptime, pad } from '../lib/format.js'
import { writeJson } from '../lib/output.js'
import { scanPorts } from '../lib/scan.js'
import { FRAMEWORK_LABELS } from '../types.js'
import type { PortFilters } from '../types.js'

export interface ListOptions extends PortFilters {
  json?: boolean
  plain?: boolean
  probeHttp?: boolean
}

export async function listCommand(options: ListOptions = {}): Promise<void> {
  const entries = filterPorts(
    await scanPorts({ probeHttp: options.probeHttp !== false }),
    options
  )

  if (options.json) {
    writeJson(entries)
    return
  }
  if (entries.length === 0) {
    console.log(options.plain ? 'No listening ports found.' : chalk.dim('No listening ports found.'))
    return
  }

  const color = options.plain ? (value: string) => value : chalk.bold
  console.log()
  console.log(
    color(
      pad('Port', 7) +
        pad('Project', 20) +
        pad('Framework', 12) +
        pad('PID', 8) +
        pad('User', 12) +
        pad('Memory', 10) +
        pad('HTTP', 11) +
        'Command'
    )
  )
  console.log(options.plain ? '-'.repeat(104) : chalk.dim('─'.repeat(104)))

  for (const entry of entries) {
    const http = entry.http?.reachable
      ? `${entry.http.status} ${entry.http.responseTimeMs}ms`
      : '—'
    const command = entry.docker
      ? `docker:${entry.docker.containerName}`
      : entry.fullCommand ?? entry.command
    const line =
      pad(String(entry.port), 7) +
      pad(entry.projectName ?? '—', 20) +
      pad(FRAMEWORK_LABELS[entry.framework], 12) +
      pad(String(entry.pid), 8) +
      pad(entry.user ?? '—', 12) +
      pad(formatMemory(entry.memoryKB), 10) +
      pad(http, 11) +
      command
    console.log(options.plain ? line : entry.framework === 'unknown' ? chalk.dim(line) : line)
  }
  console.log()
  console.log(`${entries.length} listening port${entries.length === 1 ? '' : 's'}`)
  console.log()
}
