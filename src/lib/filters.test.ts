import { describe, expect, it } from 'vitest'
import { filterPorts, isDevelopmentProcess, parsePortRange } from './filters.js'
import type { PortEntry } from '../types.js'

const base: PortEntry = {
  port: 4321,
  pid: 123,
  command: 'node',
  fullCommand: 'astro dev',
  cwd: '/tmp/demo',
  projectName: 'demo-site',
  framework: 'astro',
  user: 'flavio',
  parentPid: 100,
  parentCommand: 'npm run dev',
  processChain: ['npm run dev', 'astro dev'],
  cpuPercent: 1.2,
  memoryKB: 1024,
  uptime: '01:00',
  http: null,
  docker: null,
}

describe('filters', () => {
  it('validates ranges', () => {
    expect(parsePortRange('3000-9999')).toEqual({ min: 3000, max: 9999 })
    expect(() => parsePortRange('9000-3000')).toThrow()
  })

  it('filters across project metadata', () => {
    expect(filterPorts([base], { project: 'DEMO', framework: 'astro' })).toHaveLength(1)
    expect(filterPorts([base], { user: 'someone-else' })).toHaveLength(0)
  })

  it('recognizes development services beyond a fixed port range', () => {
    expect(isDevelopmentProcess(base)).toBe(true)
    expect(isDevelopmentProcess({
      ...base,
      port: 18080,
      framework: 'unknown',
      projectName: null,
      command: 'python',
      fullCommand: 'python app.py',
    })).toBe(true)
    expect(isDevelopmentProcess({
      ...base,
      port: 27017,
      framework: 'unknown',
      projectName: null,
      command: 'mongod',
      fullCommand: null,
      docker: {
        containerId: 'abc',
        containerName: 'mongo',
        image: 'mongo',
        privatePort: 27017,
      },
    })).toBe(true)
    expect(isDevelopmentProcess({
      ...base,
      port: 80,
      framework: 'unknown',
      projectName: null,
      command: 'caddy',
      fullCommand: null,
    })).toBe(false)
    expect(isDevelopmentProcess({
      ...base,
      port: 5000,
      framework: 'unknown',
      projectName: null,
      command: 'ControlCe',
      fullCommand: null,
      cwd: '/',
    })).toBe(false)
  })
})
