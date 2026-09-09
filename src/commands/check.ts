import chalk from 'chalk'
import { resolvePortTarget } from '../lib/config.js'
import { formatMemory, formatUptime } from '../lib/format.js'
import { writeJson } from '../lib/output.js'
import { scanPorts } from '../lib/scan.js'
import { FRAMEWORK_LABELS } from '../types.js'

export async function checkCommand(
  target: string,
  options: { json?: boolean } = {}
): Promise<void> {
  const port = resolvePortTarget(target)
  const match = (await scanPorts()).find((entry) => entry.port === port) ?? null

  if (options.json) {
    writeJson({ free: match === null, port, entry: match })
    return
  }
  if (!match) {
    console.log(chalk.green(`✓ Port ${port} is free`))
    return
  }

  console.log(`\n${chalk.yellow(`● Port ${port} is in use`)}\n`)
  console.log(`  PID:       ${chalk.bold(String(match.pid))}`)
  console.log(`  User:      ${match.user ?? '—'}`)
  console.log(`  Command:   ${match.fullCommand ?? match.command}`)
  if (match.projectName) console.log(`  Project:   ${chalk.cyan(match.projectName)}`)
  if (match.framework !== 'unknown') {
    console.log(`  Framework: ${chalk.cyan(FRAMEWORK_LABELS[match.framework])}`)
  }
  if (match.cwd) console.log(`  Directory: ${chalk.dim(match.cwd)}`)
  if (match.processChain.length > 1) {
    console.log(`  Chain:     ${chalk.dim(match.processChain.join(' → '))}`)
  }
  console.log(`  CPU:       ${match.cpuPercent?.toFixed(1) ?? '—'}%`)
  console.log(`  Memory:    ${formatMemory(match.memoryKB)}`)
  console.log(`  Uptime:    ${formatUptime(match.uptime)}`)
  if (match.http?.reachable) {
    console.log(
      `  HTTP:      ${chalk.green(String(match.http.status))} ${match.http.url} (${match.http.responseTimeMs}ms)`
    )
    if (match.http.title) console.log(`  Title:     ${match.http.title}`)
  }
  if (match.docker) {
    console.log(
      `  Docker:    ${match.docker.containerName} (${match.docker.image}, ${match.docker.privatePort ?? '?'}→${port})`
    )
  }
  console.log(chalk.dim(`\n  Stop it with: ports kill ${target}\n`))
}
