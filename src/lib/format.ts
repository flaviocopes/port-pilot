export function formatMemory(kb: number | null): string {
  if (kb === null) return '—'
  if (kb < 1024) return `${kb} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${Math.round(mb)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

export function formatUptime(etime: string | null): string {
  if (!etime) return '—'

  const trimmed = etime.trim()

  // etime format: [[DD-]HH:]MM:SS
  const dayMatch = trimmed.match(/^(\d+)-(\d+):(\d+):(\d+)$/)
  if (dayMatch) {
    const days = parseInt(dayMatch[1]!, 10)
    const hours = parseInt(dayMatch[2]!, 10)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const fullMatch = trimmed.match(/^(\d+):(\d+):(\d+)$/)
  if (fullMatch) {
    const hours = parseInt(fullMatch[1]!, 10)
    const minutes = parseInt(fullMatch[2]!, 10)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const shortMatch = trimmed.match(/^(\d+):(\d+)$/)
  if (shortMatch) {
    const minutes = parseInt(shortMatch[1]!, 10)
    const seconds = parseInt(shortMatch[2]!, 10)
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  return trimmed
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

export function pad(str: string, width: number): string {
  const visible = stripAnsi(str)
  const padding = Math.max(0, width - visible.length)
  return str + ' '.repeat(padding)
}

function stripAnsi(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '')
}
