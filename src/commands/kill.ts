import chalk from 'chalk'
import { resolvePortTarget } from '../lib/config.js'
import { writeJson } from '../lib/output.js'
import { confirm } from '../lib/prompt.js'
import { scanPorts } from '../lib/scan.js'
import { parseSignal, terminateProcessTree } from '../lib/terminate.js'

export interface KillOptions {
  yes?: boolean
  json?: boolean
  signal?: string
}

export async function killCommand(
  target: string,
  options: KillOptions = {}
): Promise<void> {
  const port = resolvePortTarget(target)
  const match = (await scanPorts({ probeHttp: false })).find((entry) => entry.port === port)
  if (!match) {
    if (options.json) writeJson({ killed: false, port, reason: 'free' })
    else console.log(chalk.dim(`Nothing is listening on port ${port}`))
    return
  }

  const signal = parseSignal(options.signal ?? 'TERM')
  if (!options.yes) {
    if (options.json) throw new Error('--json requires --yes for destructive actions')
    console.log(`\n  Port:      ${port}`)
    console.log(`  PID:       ${match.pid}`)
    console.log(`  Project:   ${match.projectName ?? '—'}`)
    console.log(`  Directory: ${match.cwd ?? '—'}`)
    console.log(`  Command:   ${match.fullCommand ?? match.command}`)
    if (match.processChain.length > 1) {
      console.log(`  Chain:     ${match.processChain.join(' → ')}`)
    }
    const approved = await confirm(`\nStop this process tree with ${signal}?`)
    if (!approved) {
      console.log(chalk.dim('Cancelled.'))
      return
    }
  }

  const result = await terminateProcessTree(match.pid, signal)
  if (options.json) writeJson({ killed: true, port, ...result })
  else {
    console.log(chalk.green(`✓ Freed port ${port}; signaled ${result.affectedPids.length} process${result.affectedPids.length === 1 ? '' : 'es'}`))
    if (result.forcedPids.length > 0) {
      console.log(chalk.yellow(`  Forced ${result.forcedPids.length} process${result.forcedPids.length === 1 ? '' : 'es'} after timeout`))
    }
  }
}
