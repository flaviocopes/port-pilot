import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

export async function confirm(message: string): Promise<boolean> {
  if (!stdin.isTTY) return false
  const prompt = createInterface({ input: stdin, output: stdout })
  try {
    const answer = await prompt.question(`${message} [y/N] `)
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes'
  } finally {
    prompt.close()
  }
}
