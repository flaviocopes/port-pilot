import { getDescendantPids, getProcessTable } from './process-info.js'

export type SupportedSignal = 'SIGINT' | 'SIGTERM' | 'SIGKILL'

export interface TerminationResult {
  pid: number
  signal: SupportedSignal
  affectedPids: number[]
  forcedPids: number[]
}

export async function terminateProcessTree(
  pid: number,
  signal: SupportedSignal = 'SIGTERM',
  forceAfterMs = 1200
): Promise<TerminationResult> {
  const table = await getProcessTable()
  const affectedPids = [...getDescendantPids(pid, table), pid]
  const signaled: number[] = []

  for (const targetPid of affectedPids) {
    if (sendSignal(targetPid, signal)) signaled.push(targetPid)
  }

  const forcedPids: number[] = []
  if (signal !== 'SIGKILL' && forceAfterMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, forceAfterMs))
    for (const targetPid of signaled) {
      if (isRunning(targetPid) && sendSignal(targetPid, 'SIGKILL')) {
        forcedPids.push(targetPid)
      }
    }
  }

  return { pid, signal, affectedPids: signaled, forcedPids }
}

export function parseSignal(value: string): SupportedSignal {
  const normalized = value.toUpperCase().replace(/^SIG/, '')
  if (normalized === 'INT') return 'SIGINT'
  if (normalized === 'TERM') return 'SIGTERM'
  if (normalized === 'KILL') return 'SIGKILL'
  throw new Error('Signal must be INT, TERM, or KILL')
}

function sendSignal(pid: number, signal: SupportedSignal): boolean {
  try {
    process.kill(pid, signal)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return false
    throw error
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
