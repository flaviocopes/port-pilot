import type { PortEntry } from '../types.js'

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function writeJsonLine(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

export function entryFingerprint(entry: PortEntry): string {
  return JSON.stringify({
    pid: entry.pid,
    port: entry.port,
    command: entry.fullCommand ?? entry.command,
    http: entry.http?.status ?? null,
    docker: entry.docker?.containerId ?? null,
  })
}
