import { execa } from 'execa'
import type { DockerInfo } from '../types.js'

interface DockerRow {
  ID?: string
  Names?: string
  Image?: string
  Ports?: string
}

export async function getDockerPortMap(): Promise<Map<number, DockerInfo>> {
  const map = new Map<number, DockerInfo>()
  try {
    const result = await execa(
      'docker',
      ['ps', '--format', '{{json .}}'],
      { reject: false, timeout: 900 }
    )
    if (result.exitCode !== 0) return map

    for (const line of result.stdout.split('\n').filter(Boolean)) {
      const row = JSON.parse(line) as DockerRow
      for (const mapping of parseDockerPorts(row.Ports ?? '')) {
        map.set(mapping.publicPort, {
          containerId: row.ID ?? 'unknown',
          containerName: row.Names ?? 'unknown',
          image: row.Image ?? 'unknown',
          privatePort: mapping.privatePort,
        })
      }
    }
  } catch {
    // Docker is optional and may not be installed or running.
  }
  return map
}

export function parseDockerPorts(
  value: string
): Array<{ publicPort: number; privatePort: number | null }> {
  const results: Array<{ publicPort: number; privatePort: number | null }> = []
  const pattern = /(?:[\d.:\[\]]+)?:(\d+)->(\d+)\/(?:tcp|udp)/g
  for (const match of value.matchAll(pattern)) {
    results.push({ publicPort: Number(match[1]), privatePort: Number(match[2]) })
  }
  return results
}
