import React from 'react'
import { Box, Text } from 'ink'
import type { PortEntry } from '../types.js'
import { FRAMEWORK_LABELS } from '../types.js'
import { formatMemory, formatUptime, truncate } from '../lib/format.js'

interface ProcessRowProps {
  entry: PortEntry
  selected: boolean
}

export function ProcessRow({ entry, selected }: ProcessRowProps) {
  const isDev =
    entry.framework !== 'unknown' ||
    ['node', 'deno', 'bun'].some((c) => entry.command.toLowerCase().includes(c))

  const dim = !isDev && !selected
  const cursor = selected ? '▸' : ' '

  const frameworkLabel = FRAMEWORK_LABELS[entry.framework] ?? '—'

  const memHighlight = entry.memoryKB !== null && entry.memoryKB > 500 * 1024

  return (
    <Box paddingX={1}>
      <Box width={3}>
        <Text color={selected ? 'cyan' : undefined} bold={selected}>
          {cursor}
        </Text>
      </Box>

      <Box width={7}>
        <Text dimColor={dim} bold={selected}>
          {entry.port}
        </Text>
      </Box>

      <Box width={22}>
        <Text dimColor={dim} color={entry.projectName ? undefined : undefined}>
          {truncate(entry.projectName ?? '—', 20)}
        </Text>
      </Box>

      <Box width={12}>
        <Text
          dimColor={dim}
          color={entry.framework !== 'unknown' ? 'cyan' : undefined}>
          {frameworkLabel}
        </Text>
      </Box>

      <Box width={8}>
        <Text dimColor={dim}>{entry.pid}</Text>
      </Box>

      <Box width={10}>
        <Text dimColor={dim} color={memHighlight ? 'red' : undefined}>
          {formatMemory(entry.memoryKB)}
        </Text>
      </Box>

      <Box width={10}>
        <Text dimColor={dim}>{formatUptime(entry.uptime)}</Text>
      </Box>

      <Box width={11}>
        <Text
          dimColor={!entry.http?.reachable}
          color={entry.http?.reachable ? 'green' : undefined}>
          {entry.http?.reachable
            ? `${entry.http.status} ${entry.http.responseTimeMs}ms`
            : '—'}
        </Text>
      </Box>

      <Box flexGrow={1}>
        <Text dimColor>
          {truncate(
            entry.docker
              ? `docker:${entry.docker.containerName}`
              : entry.fullCommand ?? entry.command,
            30
          )}
        </Text>
      </Box>
    </Box>
  )
}
