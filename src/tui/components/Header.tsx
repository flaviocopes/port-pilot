import React from 'react'
import { Box, Text } from 'ink'

interface HeaderProps {
  count: number
  filterLabel: string
  sortLabel: string
}

export function Header({ count, filterLabel, sortLabel }: HeaderProps) {
  return (
    <Box paddingX={1} marginBottom={1} justifyContent='space-between'>
      <Text bold color='cyan'>
        Port Pilot
      </Text>
      <Box gap={2}>
        <Text dimColor>{filterLabel}</Text>
        <Text dimColor>sort: {sortLabel}</Text>
        <Text dimColor>
          {count} process{count !== 1 ? 'es' : ''}
        </Text>
      </Box>
    </Box>
  )
}
