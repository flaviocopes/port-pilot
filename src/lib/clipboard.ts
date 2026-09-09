import { execa } from 'execa'
import { platform } from 'node:os'

export async function copyText(value: string): Promise<void> {
  const candidates = platform() === 'darwin'
    ? [['pbcopy', []] as const]
    : [
        ['wl-copy', []] as const,
        ['xclip', ['-selection', 'clipboard']] as const,
        ['xsel', ['--clipboard', '--input']] as const,
      ]

  for (const [command, args] of candidates) {
    try {
      await execa(command, args, { input: value })
      return
    } catch {
      // Try the next platform clipboard provider.
    }
  }
  throw new Error('No supported clipboard command found')
}
