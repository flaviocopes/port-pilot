import chalk from 'chalk'
import { resolvePortTarget } from '../lib/config.js'
import { writeJson } from '../lib/output.js'
import { scanPorts } from '../lib/scan.js'

export interface WaitOptions {
  ready?: boolean
  free?: boolean
  http?: string
  timeout?: string
  interval?: string
  json?: boolean
}

export async function waitCommand(
  target: string,
  options: WaitOptions
): Promise<void> {
  const port = resolvePortTarget(target)
  const timeoutMs = parsePositiveNumber(options.timeout ?? '30', 'timeout') * 1000
  const intervalMs = parsePositiveNumber(options.interval ?? '500', 'interval')
  const expectedHttp = options.http ? Number(options.http) : null
  const startedAt = Date.now()

  while (Date.now() - startedAt <= timeoutMs) {
    const entry = (await scanPorts({ probeHttp: expectedHttp !== null })).find(
      (candidate) => candidate.port === port
    )
    const matched = options.free
      ? !entry
      : expectedHttp !== null
        ? entry?.http?.status === expectedHttp
        : Boolean(entry)

    if (matched) {
      const result = { ready: !options.free, free: Boolean(options.free), port, entry: entry ?? null, waitedMs: Date.now() - startedAt }
      if (options.json) writeJson(result)
      else console.log(chalk.green(`✓ Port ${port} is ${options.free ? 'free' : expectedHttp !== null ? `responding with HTTP ${expectedHttp}` : 'ready'}`))
      return
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  if (options.json) writeJson({ ready: false, port, timedOut: true, waitedMs: Date.now() - startedAt })
  throw new Error(`Timed out waiting for port ${port}`)
}

function parsePositiveNumber(value: string, label: string): number {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be a positive number`)
  return number
}
