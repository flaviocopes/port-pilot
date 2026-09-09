import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

interface PortPilotConfig {
  aliases: Record<string, number>
}

function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, 'port-pilot', 'config.json')
}

export function loadConfig(): PortPilotConfig {
  const path = configPath()
  if (!existsSync(path)) return { aliases: {} }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<PortPilotConfig>
    return { aliases: parsed.aliases ?? {} }
  } catch {
    return { aliases: {} }
  }
}

export function saveAlias(name: string, port: number): void {
  validateAliasName(name)
  const config = loadConfig()
  config.aliases[name] = port
  saveConfig(config)
}

export function removeAlias(name: string): boolean {
  const config = loadConfig()
  if (!(name in config.aliases)) return false
  delete config.aliases[name]
  saveConfig(config)
  return true
}

export function resolvePortTarget(target: string): number {
  if (/^\d+$/.test(target)) {
    const port = Number(target)
    if (port >= 1 && port <= 65535) return port
  }
  const alias = loadConfig().aliases[target]
  if (alias) return alias
  throw new Error(`Unknown port or alias: ${target}`)
}

export function listAliases(): Record<string, number> {
  return loadConfig().aliases
}

function saveConfig(config: PortPilotConfig): void {
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
}

function validateAliasName(name: string): void {
  if (!/^[a-z][a-z0-9._-]*$/i.test(name)) {
    throw new Error('Alias names must start with a letter and use letters, numbers, ., _ or -')
  }
}
