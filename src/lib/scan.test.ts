import { describe, expect, it } from 'vitest'
import { deduplicatePorts, parseLsofOutput, parseSsOutput } from './scan.js'

describe('port scanner adapters', () => {
  it('parses macOS lsof output and removes IPv4/IPv6 duplicates', () => {
    const output = `COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
node 123 flavio 22u IPv6 0x01 0t0 TCP *:4321 (LISTEN)
node 123 flavio 23u IPv4 0x02 0t0 TCP *:4321 (LISTEN)`
    expect(deduplicatePorts(parseLsofOutput(output))).toEqual([
      { command: 'node', pid: 123, port: 4321 },
    ])
  })

  it('parses Linux ss output', () => {
    const output = `LISTEN 0 511 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=912,fd=20))`
    expect(parseSsOutput(output)).toEqual([
      { command: 'node', pid: 912, port: 3000 },
    ])
  })
})
