import { describe, expect, it } from 'vitest'
import { extractHtmlTitle, shouldProbeHttp } from './http-health.js'

describe('HTTP health helpers', () => {
  it('extracts and normalizes a page title', () => {
    expect(extractHtmlTitle('<title> Port\n Pilot </title>')).toBe('Port Pilot')
  })

  it('skips common non-HTTP services', () => {
    expect(shouldProbeHttp(5432)).toBe(false)
    expect(shouldProbeHttp(4321)).toBe(true)
  })
})
