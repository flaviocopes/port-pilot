import type { PortEntry, PortFilters } from '../types.js'

export function parsePortRange(value: string): { min: number; max: number } {
  const match = value.match(/^(\d+)(?:-(\d+))?$/)
  if (!match) throw new Error(`Invalid port range: ${value}`)

  const min = Number(match[1])
  const max = Number(match[2] ?? match[1])
  if (min < 1 || max > 65535 || min > max) {
    throw new Error(`Port range must be between 1 and 65535: ${value}`)
  }
  return { min, max }
}

export function filterPorts(
  entries: PortEntry[],
  filters: PortFilters
): PortEntry[] {
  return entries.filter((entry) => {
    if (filters.dev && !isDevelopmentProcess(entry)) return false
    if (
      filters.range &&
      (entry.port < filters.range.min || entry.port > filters.range.max)
    ) {
      return false
    }
    if (
      filters.framework &&
      entry.framework.toLowerCase() !== filters.framework.toLowerCase()
    ) {
      return false
    }
    if (
      filters.project &&
      !entry.projectName?.toLowerCase().includes(filters.project.toLowerCase())
    ) {
      return false
    }
    if (
      filters.user &&
      entry.user?.toLowerCase() !== filters.user.toLowerCase()
    ) {
      return false
    }
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const searchable = [
        entry.port,
        entry.pid,
        entry.projectName,
        entry.command,
        entry.fullCommand,
        entry.cwd,
        entry.user,
        entry.framework,
        entry.docker?.containerName,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase()
      if (!searchable.includes(query)) return false
    }
    return true
  })
}

export function isDevelopmentProcess(entry: PortEntry): boolean {
  const command = `${entry.command} ${entry.fullCommand ?? ''}`.toLowerCase()
  return (
    entry.projectName !== null ||
    entry.framework !== 'unknown' ||
    entry.docker !== null ||
    ['node', 'deno', 'bun', 'python', 'ruby', 'cargo', 'go run'].some((name) =>
      command.includes(name)
    )
  )
}
