import React from 'react'
import { render } from 'ink'
import { Dashboard } from './Dashboard.js'

export function startTUI(): void {
  render(<Dashboard />)
}
