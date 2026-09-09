import { Command } from 'commander'
import { checkCommand } from './commands/check.js'
import { completionCommand } from './commands/completion.js'
import { isFreeCommand } from './commands/is-free.js'
import { killCommand } from './commands/kill.js'
import { listCommand } from './commands/list.js'
import { openCommand } from './commands/open.js'
import { waitCommand } from './commands/wait.js'
import { watchCommand } from './commands/watch.js'
import { listAliases, removeAlias, saveAlias } from './lib/config.js'
import { parsePortRange } from './lib/filters.js'
import { writeJson } from './lib/output.js'

const program = new Command()

program
  .name('ports')
  .description('See every local service, check its health, and stop it safely.')
  .version('1.0.0')
  .showSuggestionAfterError()
  .addHelpText(
    'after',
    `
Examples:
  $ ports                              Open the interactive dashboard
  $ ports list                         List development services
  $ ports list --all                   Include every listening port
  $ ports check 4321 --json            Inspect a port for an agent
  $ ports is-free 4321                 Exit 0 when free, 1 when occupied
  $ ports wait 4321 --http 200         Wait for a healthy web service
  $ ports kill 4321                    Preview and confirm before stopping
  $ ports alias api 8787               Give a port a memorable name
  $ ports watch --json                 Stream lifecycle events as JSON`
  )

program
  .command('list')
  .alias('ls')
  .description('List listening ports with project, process, HTTP, and Docker context')
  .option('--json', 'print structured JSON')
  .option('--plain', 'disable colors for scripts and logs')
  .option('--dev', 'show likely development services (default)')
  .option('--all', 'include every listener, including system services')
  .option('--range <ports>', 'filter by port or range, for example 3000-9999')
  .option('--framework <name>', 'filter by detected framework')
  .option('--project <name>', 'filter by project name')
  .option('--user <name>', 'filter by process owner')
  .option('--search <query>', 'search all visible process fields')
  .option('--no-http', 'skip HTTP health probes')
  .action(async (options) => {
    await listCommand({
      json: options.json,
      plain: options.plain,
      dev: !options.all,
      range: options.range ? parsePortRange(options.range) : undefined,
      framework: options.framework,
      project: options.project,
      user: options.user,
      query: options.search,
      probeHttp: options.http,
    })
  })

program
  .command('check')
  .description('Inspect a port or alias in detail')
  .argument('<port-or-alias>')
  .option('--json', 'print structured JSON')
  .action(checkCommand)

program
  .command('is-free')
  .description('Exit 0 when a port is free and 1 when it is occupied')
  .argument('<port-or-alias>')
  .option('--json', 'print structured JSON')
  .action(isFreeCommand)

program
  .command('kill')
  .description('Safely stop the process tree listening on a port')
  .argument('<port-or-alias>')
  .option('-y, --yes', 'skip interactive confirmation')
  .option('--signal <signal>', 'initial signal: INT, TERM, or KILL', 'TERM')
  .option('--json', 'print structured JSON; requires --yes')
  .action(killCommand)

program
  .command('open')
  .description('Open the detected local HTTP service in a browser')
  .argument('<port-or-alias>')
  .action(openCommand)

program
  .command('wait')
  .description('Wait for a port to become ready, free, or return an HTTP status')
  .argument('<port-or-alias>')
  .option('--ready', 'wait for a listener; this is the default')
  .option('--free', 'wait for the port to become free')
  .option('--http <status>', 'wait for an HTTP status code')
  .option('--timeout <seconds>', 'maximum wait time', '30')
  .option('--interval <milliseconds>', 'polling interval', '500')
  .option('--json', 'print structured JSON')
  .action(async (target, options) => {
    if (options.free && options.http) throw new Error('--free and --http cannot be combined')
    await waitCommand(target, options)
  })

program
  .command('watch')
  .description('Stream port start, stop, and change events')
  .option('--json', 'emit newline-delimited JSON events')
  .option('--interval <milliseconds>', 'scan interval', '1000')
  .option('--http', 'include HTTP health changes')
  .option('--all', 'include every listener, including system services')
  .action(watchCommand)

program
  .command('alias')
  .description('Create, list, or remove memorable port aliases')
  .argument('[name]')
  .argument('[port]')
  .option('--remove <name>', 'remove an alias')
  .option('--json', 'print structured JSON')
  .action((name, port, options) => {
    if (options.remove) {
      const removed = removeAlias(options.remove)
      if (options.json) writeJson({ removed, name: options.remove })
      else console.log(removed ? `Removed ${options.remove}` : `Alias ${options.remove} does not exist`)
      return
    }
    if (!name && !port) {
      const aliases = listAliases()
      if (options.json) writeJson(aliases)
      else if (Object.keys(aliases).length === 0) console.log('No aliases configured.')
      else for (const [alias, aliasPort] of Object.entries(aliases)) console.log(`${alias.padEnd(20)} ${aliasPort}`)
      return
    }
    if (!name || !port || !/^\d+$/.test(port)) throw new Error('Usage: ports alias <name> <port>')
    const numericPort = Number(port)
    if (numericPort < 1 || numericPort > 65535) throw new Error('Port must be between 1 and 65535')
    saveAlias(name, numericPort)
    if (options.json) writeJson({ name, port: numericPort })
    else console.log(`Saved ${name} → ${numericPort}`)
  })

program
  .command('completion')
  .description('Generate shell completions')
  .argument('<bash|zsh|fish>')
  .action(completionCommand)

try {
  if (process.argv.length <= 2) {
    const { startTUI } = await import('./tui/App.js')
    startTUI()
  } else {
    await program.parseAsync()
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
