import { execa } from 'execa'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { platform } from 'node:os'
import { detectFramework } from './detect.js'
import type { Framework } from '../types.js'

export interface ProcessRecord {
  pid: number
  parentPid: number
  user: string
  cpuPercent: number
  memoryKB: number
  uptime: string
  command: string
}

export interface ProcessInfo {
  cwd: string | null
  projectName: string | null
  framework: Framework
  user: string | null
  parentPid: number | null
  parentCommand: string | null
  processChain: string[]
  cpuPercent: number | null
  memoryKB: number | null
  uptime: string | null
  fullCommand: string | null
}

export async function getProcessTable(): Promise<Map<number, ProcessRecord>> {
  const table = new Map<number, ProcessRecord>()
  try {
    const result = await execa(
      'ps',
      ['-axo', 'pid=,ppid=,user=,pcpu=,rss=,etime=,command='],
      { reject: false }
    )
    for (const line of result.stdout.split('\n')) {
      const record = parseProcessLine(line)
      if (record) table.set(record.pid, record)
    }
  } catch {
    // A partial port record is still useful when process metadata is unavailable.
  }
  return table
}

export function parseProcessLine(line: string): ProcessRecord | null {
  const match = line.match(
    /^\s*(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+(\d+)\s+([\d:.-]+)\s+(.+)$/
  )
  if (!match) return null
  return {
    pid: Number(match[1]),
    parentPid: Number(match[2]),
    user: match[3]!,
    cpuPercent: Number(match[4]),
    memoryKB: Number(match[5]),
    uptime: match[6]!,
    command: match[7]!,
  }
}

export async function getProcessInfo(
  pid: number,
  table: Map<number, ProcessRecord>
): Promise<ProcessInfo> {
  const cwd = await getProcessCwd(pid)
  const record = table.get(pid)
  const parent = record ? table.get(record.parentPid) : undefined
  let projectName: string | null = null
  let framework: Framework = 'unknown'

  if (cwd) {
    const packageDir = findPackageJsonDir(cwd)
    if (packageDir) {
      const pkg = readPackageJson(packageDir)
      projectName = pkg?.name ?? basename(packageDir)
      framework = detectFramework(packageDir)
    }
  }

  return {
    cwd,
    projectName,
    framework,
    user: record?.user ?? null,
    parentPid: record?.parentPid ?? null,
    parentCommand: parent ? shortenCommand(parent.command) : null,
    processChain: record ? buildProcessChain(record.pid, table) : [],
    cpuPercent: record?.cpuPercent ?? null,
    memoryKB: record?.memoryKB ?? null,
    uptime: record?.uptime ?? null,
    fullCommand: record ? shortenCommand(record.command) : null,
  }
}

export function getDescendantPids(
  pid: number,
  table: Map<number, ProcessRecord>
): number[] {
  const descendants: number[] = []
  const queue = [pid]
  while (queue.length > 0) {
    const parentPid = queue.shift()!
    for (const record of table.values()) {
      if (record.parentPid === parentPid && !descendants.includes(record.pid)) {
        descendants.push(record.pid)
        queue.push(record.pid)
      }
    }
  }
  return descendants.reverse()
}

async function getProcessCwd(pid: number): Promise<string | null> {
  if (platform() === 'linux') {
    try {
      return realpathSync(`/proc/${pid}/cwd`)
    } catch {
      // Fall through to lsof when /proc is restricted.
    }
  }

  try {
    const result = await execa('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
      reject: false,
    })
    for (const line of result.stdout.trim().split('\n')) {
      if (line.startsWith('n') && line.length > 1 && line !== 'ncwd') {
        return line.slice(1)
      }
    }
  } catch {
    // CWD can be unavailable for system processes owned by another user.
  }
  return null
}

function buildProcessChain(
  pid: number,
  table: Map<number, ProcessRecord>
): string[] {
  const chain: string[] = []
  let current = table.get(pid)
  const visited = new Set<number>()

  while (current && !visited.has(current.pid) && chain.length < 6) {
    visited.add(current.pid)
    chain.unshift(shortenCommand(current.command))
    if (current.parentPid <= 1) break
    current = table.get(current.parentPid)
  }
  return chain
}

export function shortenCommand(command: string): string {
  const binMatch = command.match(
    /node\s+.*\/(\.bin\/(\S+)|(\S+\.(js|ts|mjs)))(\s+.*)?$/
  )
  if (binMatch) {
    const bin = binMatch[2] ?? binMatch[3] ?? ''
    const args = binMatch[5]?.trim() ?? ''
    return args ? `${bin} ${args}` : bin
  }

  const parts = command.split(/\s+/)
  const executable = parts[0]?.replace(/^.*\//, '') ?? command
  const args = parts.slice(1).join(' ')
  return args ? `${executable} ${args}` : executable
}

function findPackageJsonDir(startDir: string): string | null {
  let directory = startDir
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(directory, 'package.json'))) return directory
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  return null
}

function readPackageJson(directory: string): { name?: string } | null {
  try {
    return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf-8'))
  } catch {
    return null
  }
}
