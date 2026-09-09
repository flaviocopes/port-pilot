import { describe, expect, it } from 'vitest'
import { parseDockerPorts } from './docker.js'

describe('Docker port parsing', () => {
  it('maps IPv4 and IPv6 published ports', () => {
    expect(
      parseDockerPorts('0.0.0.0:8080->80/tcp, [::]:8080->80/tcp')
    ).toEqual([
      { publicPort: 8080, privatePort: 80 },
      { publicPort: 8080, privatePort: 80 },
    ])
  })
})
