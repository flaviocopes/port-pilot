import React from 'react'
import { Box, Text } from 'ink'

interface FilterBarProps {
  searchQuery: string
}

export function FilterBar({ searchQuery }: FilterBarProps) {
  return (
    <Box paddingX={1}>
      <Text color='yellow'>/ </Text>
      <Text>{searchQuery}</Text>
      <Text dimColor>▌</Text>
    </Box>
  )
}
