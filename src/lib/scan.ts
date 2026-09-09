import { execa } from 'execa'
import { platform } from 'node:os'
import { getDockerPortMap } from './docker.js'
import { probeHttp } from './http-health.js'
import { getProcessInfo, getProcessTable } from './process-info.js'
import type { PortEntry, ScanOptions } from '../types.js'

export interface RawPort {
  pid: number
  port: number
  command: string
}

export async function scanPorts(options: ScanOptions = {}): Promise<PortEntry[]> {
  const [rawPorts, processTable, dockerPorts] = await Promise.all([
    getRawPorts(),
    getProcessTable(),
    getDockerPortMap(),
  ])
  const deduped = deduplicatePorts(rawPorts)

  const entries = await Promise.all(
    deduped.map(async (raw) => {
      const info = await getProcessInfo(raw.pid, processTable)
      const http = options.probeHttp === false
        ? null
        : await probeHttp(raw.port, options.httpTimeoutMs)
      return {
        port: raw.port,
        pid: raw.pid,
        command: raw.command,
        fullCommand: info.fullCommand,
        cwd: info.cwd,
        projectName: info.projectName,
        framework: info.framework,
        user: info.user,
        parentPid: info.parentPid,
        parentCommand: info.parentCommand,
        processChain: info.processChain,
        cpuPercent: info.cpuPercent,
        memoryKB: info.memoryKB,
        uptime: info.uptime,
        http,
        docker: dockerPorts.get(raw.port) ?? null,
      } satisfies PortEntry
    })
  )

  return entries.sort((a, b) => a.port - b.port)
}

async function getRawPorts(): Promise<RawPort[]> {
  const currentPlatform = platform()
  if (currentPlatform === 'darwin') return getLsofPorts()
  if (currentPlatform === 'linux') {
    const fromSs = await getSsPorts()
    return fromSs.length > 0 ? fromSs : getLsofPorts()
  }
  throw new Error(
    `Port Pilot currently supports macOS and Linux. Detected: ${currentPlatform}`
  )
}

async function getLsofPorts(): Promise<RawPort[]> {
  try {
    const result = await execa('lsof', ['-iTCP', '-sTCP:LISTEN', '-P', '-n'], {
      reject: false,
    })
    return parseLsofOutput(result.stdout)
  } catch {
    return []
  }
}

async function getSsPorts(): Promise<RawPort[]> {
  try {
    const result = await execa('ss', ['-ltnpH'], { reject: false })
    return parseSsOutput(result.stdout)
  } catch {
    return []
  }
}

export function parseLsofOutput(output: string): RawPort[] {
  const entries: RawPort[] = []
  for (const line of output.trim().split('\n').slice(1)) {
    if (!line.includes('LISTEN')) continue
    const parts = line.trim().split(/\s+/)
    if (parts.length < 9) continue
    const command = parts[0] ?? ''
    const pid = Number(parts[1])
    const nameColumn = parts[parts.length - 2] ?? ''
    const portMatch = nameColumn.match(/:(\d+)$/)
    if (!portMatch || !Number.isInteger(pid)) continue
    entries.push({ pid, port: Number(portMatch[1]), command })
  }
  return entries
}

export function parseSsOutput(output: string): RawPort[] {
  const entries: RawPort[] = []
  for (const line of output.trim().split('\n').filter(Boolean)) {
    const processMatch = line.match(/users:\(\(\"([^\"]+)\",pid=(\d+)/)
    if (!processMatch) continue
    const beforeProcess = line.slice(0, processMatch.index).trim()
    const columns = beforeProcess.split(/\s+/)
    const localAddress = columns[3] ?? columns[2] ?? ''
    const portMatch = localAddress.match(/:(\d+)$/)
    if (!portMatch) continue
    entries.push({
      command: processMatch[1]!,
      pid: Number(processMatch[2]),
      port: Number(portMatch[1]),
    })
  }
  return entries
}

export function deduplicatePorts(entries: RawPort[]): RawPort[] {
  const unique = new Map<string, RawPort>()
  for (const entry of entries) {
    unique.set(`${entry.pid}:${entry.port}`, entry)
  }
  return [...unique.values()]
}
