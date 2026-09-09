export type Shell = 'bash' | 'zsh' | 'fish'

const COMMANDS = 'list check is-free kill open wait watch alias completion'

export function completionCommand(shell: string): void {
  if (shell === 'bash') {
    console.log(`_ports_completion() {
  local cur="${'${COMP_WORDS[COMP_CWORD]}'}"
  COMPREPLY=( $(compgen -W "${COMMANDS}" -- "$cur") )
}
complete -F _ports_completion ports`)
    return
  }
  if (shell === 'zsh') {
    console.log(`#compdef ports
_arguments '1:command:(${COMMANDS})' '*::argument:->args'`)
    return
  }
  if (shell === 'fish') {
    for (const command of COMMANDS.split(' ')) {
      console.log(`complete -c ports -f -n '__fish_use_subcommand' -a '${command}'`)
    }
    return
  }
  throw new Error('Shell must be bash, zsh, or fish')
}
