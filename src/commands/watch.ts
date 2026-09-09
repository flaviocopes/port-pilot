import chalk from 'chalk'
import { isDevelopmentProcess } from '../lib/filters.js'
import { entryFingerprint, writeJsonLine } from '../lib/output.js'
import { scanPorts } from '../lib/scan.js'
import type { PortEntry } from '../types.js'

export interface WatchOptions {
  json?: boolean
  interval?: string
  http?: boolean
  all?: boolean
}

export async function watchCommand(options: WatchOptions): Promise<void> {
  const intervalMs = Number(options.interval ?? '1000')
  if (!Number.isFinite(intervalMs) || intervalMs < 100) {
    throw new Error('Watch interval must be at least 100ms')
  }

  let stopped = false
  const stop = () => { stopped = true }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  let previous = toMap(await visiblePorts(options))
  emit('snapshot', [...previous.values()], options.json)

  while (!stopped) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    if (stopped) break
    const current = toMap(await visiblePorts(options))

    for (const [key, entry] of current) {
      const old = previous.get(key)
      if (!old) emit('started', entry, options.json)
      else if (entryFingerprint(old) !== entryFingerprint(entry)) {
        emit('changed', entry, options.json)
      }
    }
    for (const [key, entry] of previous) {
      if (!current.has(key)) emit('stopped', entry, options.json)
    }
    previous = current
  }
}

async function visiblePorts(options: WatchOptions): Promise<PortEntry[]> {
  const entries = await scanPorts({ probeHttp: options.http === true })
  return options.all ? entries : entries.filter(isDevelopmentProcess)
}

function toMap(entries: PortEntry[]): Map<string, PortEntry> {
  return new Map(entries.map((entry) => [`${entry.pid}:${entry.port}`, entry]))
}

function emit(event: string, value: PortEntry | PortEntry[], json?: boolean): void {
  const payload = { event, timestamp: new Date().toISOString(), value }
  if (json) writeJsonLine(payload)
  else if (event === 'snapshot') console.log(chalk.dim(`Watching ${(value as PortEntry[]).length} listening ports…`))
  else {
    const entry = value as PortEntry
    const color = event === 'started' ? chalk.green : event === 'stopped' ? chalk.red : chalk.yellow
    console.log(color(`${event.padEnd(7)} :${entry.port} ${entry.projectName ?? entry.command} (PID ${entry.pid})`))
  }
}
