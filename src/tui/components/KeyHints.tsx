import React from 'react'
import { Box, Text } from 'ink'

interface HintProps {
  keys: Array<{ key: string; label: string }>
}

export function KeyHints({ keys }: HintProps) {
  return (
    <Box paddingX={1} marginTop={1} gap={2}>
      {keys.map(({ key, label }) => (
        <Box key={key}>
          <Text color='cyan' bold>
            [{key}]
          </Text>
          <Text dimColor> {label}</Text>
        </Box>
      ))}
    </Box>
  )
}
