import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import open from 'open'
import { scanPorts } from '../lib/scan.js'
import { copyText } from '../lib/clipboard.js'
import { isDevelopmentProcess } from '../lib/filters.js'
import { terminateProcessTree } from '../lib/terminate.js'
import type { PortEntry, SortField, FilterMode } from '../types.js'
import { Header } from './components/Header.js'
import { KeyHints } from './components/KeyHints.js'
import { FilterBar } from './components/FilterBar.js'
import { ProcessRow } from './ProcessRow.js'

const SORT_FIELDS: SortField[] = ['port', 'memory', 'uptime', 'name']
const FILTER_MODES: FilterMode[] = ['dev', 'all', 'node']
const FILTER_LABELS: Record<FilterMode, string> = {
  all: 'all ports',
  dev: 'development services',
  node: 'node only',
}
const SORT_LABELS: Record<SortField, string> = {
  port: 'port',
  memory: 'memory',
  uptime: 'uptime',
  name: 'name',
}

export function Dashboard() {
  const { exit } = useApp()
  const [entries, setEntries] = useState<PortEntry[]>([])
  const [selected, setSelected] = useState(0)
  const [sortField, setSortField] = useState<SortField>('port')
  const [filterMode, setFilterMode] = useState<FilterMode>('dev')
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingKillPid, setPendingKillPid] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const scanned = await scanPorts()
    setEntries(scanned)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  const filtered = applyFilter(entries, filterMode, searchQuery)
  const sorted = applySort(filtered, sortField)

  useEffect(() => {
    if (selected >= sorted.length) {
      setSelected(Math.max(0, sorted.length - 1))
    }
  }, [sorted.length, selected])

  function showMessage(msg: string) {
    if (messageTimer.current) clearTimeout(messageTimer.current)
    setMessage(msg)
    messageTimer.current = setTimeout(() => setMessage(null), 3000)
  }

  useInput((input, key) => {
    if (pendingKillPid !== null) {
      if (input.toLowerCase() === 'y') {
        void handleConfirmedKill(pendingKillPid)
      } else if (input.toLowerCase() === 'n' || key.escape) {
        setPendingKillPid(null)
        showMessage('Stop cancelled')
      }
      return
    }

    if (searching) {
      if (key.escape || key.return) {
        setSearching(false)
        if (key.escape) setSearchQuery('')
        return
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1))
        return
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input)
      }
      return
    }

    if (key.upArrow || input === 'k') {
      setSelected((s) => Math.max(0, s - 1))
    }
    if (key.downArrow || input === 'j') {
      setSelected((s) => Math.min(sorted.length - 1, s + 1))
    }

    if (input === 'q') exit()
    if (input === 'r') refresh()

    if (input === 'f') {
      setFilterMode((m) => {
        const idx = FILTER_MODES.indexOf(m)
        return FILTER_MODES[(idx + 1) % FILTER_MODES.length]!
      })
      setSelected(0)
    }

    if (input === 's') {
      setSortField((s) => {
        const idx = SORT_FIELDS.indexOf(s)
        return SORT_FIELDS[(idx + 1) % SORT_FIELDS.length]!
      })
    }

    if (input === '/') {
      setSearching(true)
      setSearchQuery('')
    }

    if (input === 'K') {
      const entry = sorted[selected]
      if (entry) {
        if (messageTimer.current) clearTimeout(messageTimer.current)
        setPendingKillPid(entry.pid)
        setMessage(`Stop ${entry.projectName ?? entry.command} on :${entry.port}? [y/N]`)
      }
    }

    if (input === 'o') {
      const entry = sorted[selected]
      if (entry) {
        const url = entry.http?.reachable
          ? entry.http.url
          : `http://localhost:${entry.port}`
        void open(url)
        showMessage(`Opened ${url}`)
      }
    }

    if (input === 'e') {
      const entry = sorted[selected]
      if (entry?.cwd) {
        openInEditor(entry.cwd)
        showMessage(`Opened ${entry.projectName ?? entry.cwd} in editor`)
      }
    }

    if (['u', 'p', 'c', 'd'].includes(input)) {
      const entry = sorted[selected]
      if (!entry) return
      const values: Record<string, [string | null, string]> = {
        u: [entry.http?.url ?? `http://localhost:${entry.port}`, 'URL'],
        p: [String(entry.port), 'port'],
        c: [entry.fullCommand ?? entry.command, 'command'],
        d: [entry.cwd, 'directory'],
      }
      const [value, label] = values[input]!
      if (!value) {
        showMessage(`No ${label} available`)
        return
      }
      void copyText(value)
        .then(() => showMessage(`Copied ${label}`))
        .catch((error) => showMessage(error instanceof Error ? error.message : 'Copy failed'))
    }
  })

  async function handleConfirmedKill(pid: number) {
    const entry = entries.find((candidate) => candidate.pid === pid)
    setPendingKillPid(null)
    try {
      const result = await terminateProcessTree(pid)
      showMessage(
        `Stopped ${result.affectedPids.length} process${result.affectedPids.length === 1 ? '' : 'es'}${entry ? ` on :${entry.port}` : ''}`
      )
      setTimeout(refresh, 300)
    } catch {
      showMessage(`Failed to stop PID ${pid}`)
    }
  }

  async function openInEditor(path: string) {
    try {
      await open(path, { app: { name: 'cursor' } })
    } catch {
      try {
        await open(path, { app: { name: 'code' } })
      } catch {
        await open(path)
      }
    }
  }

  if (loading) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>Scanning ports...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='column' paddingY={1}>
      <Header
        count={sorted.length}
        filterLabel={FILTER_LABELS[filterMode]}
        sortLabel={SORT_LABELS[sortField]}
      />

      <Box paddingX={1} marginBottom={0}>
        <Box width={3} />
        <Box width={7}>
          <Text bold dimColor>
            Port
          </Text>
        </Box>
        <Box width={22}>
          <Text bold dimColor>
            Project
          </Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>
            Framework
          </Text>
        </Box>
        <Box width={8}>
          <Text bold dimColor>
            PID
          </Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>
            Memory
          </Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>
            Uptime
          </Text>
        </Box>
        <Box width={11}>
          <Text bold dimColor>
            HTTP
          </Text>
        </Box>
        <Box flexGrow={1}>
          <Text bold dimColor>
            Cmd
          </Text>
        </Box>
      </Box>

      {sorted.length === 0 ? (
        <Box paddingX={4} paddingY={1}>
          <Text dimColor>No matching processes found</Text>
        </Box>
      ) : (
        sorted.map((entry, i) => (
          <ProcessRow
            key={`${entry.pid}-${entry.port}`}
            entry={entry}
            selected={i === selected}
          />
        ))
      )}

      {searching && <FilterBar searchQuery={searchQuery} />}

      {sorted[selected] && (
        <Box paddingX={1} marginTop={1} flexDirection='column'>
          <Text dimColor>
            {[
              sorted[selected]!.user ? `user ${sorted[selected]!.user}` : null,
              sorted[selected]!.processChain.length > 1
                ? sorted[selected]!.processChain.join(' → ')
                : null,
              sorted[selected]!.docker
                ? `Docker ${sorted[selected]!.docker!.containerName}`
                : null,
              sorted[selected]!.http?.title,
            ]
              .filter(Boolean)
              .join('  •  ')}
          </Text>
        </Box>
      )}

      {message && (
        <Box paddingX={1} marginTop={1}>
          <Text color='green'>{message}</Text>
        </Box>
      )}

      <KeyHints
        keys={[
          { key: 'K', label: 'Stop safely' },
          { key: 'o', label: 'Open' },
          { key: 'e', label: 'Editor' },
          { key: 'u/p/c/d', label: 'Copy' },
          { key: 'f', label: 'Filter' },
          { key: 's', label: 'Sort' },
          { key: '/', label: 'Search' },
          { key: 'r', label: 'Refresh' },
          { key: 'q', label: 'Quit' },
        ]}
      />
    </Box>
  )
}

function applyFilter(
  entries: PortEntry[],
  mode: FilterMode,
  query: string
): PortEntry[] {
  let result = entries

  if (mode === 'dev') {
    result = result.filter(isDevelopmentProcess)
  } else if (mode === 'node') {
    result = result.filter(
      (e) =>
        e.framework !== 'unknown' ||
        ['node', 'deno', 'bun'].some((c) => e.command.toLowerCase().includes(c))
    )
  }

  if (query) {
    const q = query.toLowerCase()
    result = result.filter(
      (e) =>
        String(e.port).includes(q) ||
        (e.projectName?.toLowerCase().includes(q) ?? false) ||
        e.command.toLowerCase().includes(q)
    )
  }

  return result
}

function applySort(entries: PortEntry[], field: SortField): PortEntry[] {
  const sorted = [...entries]

  switch (field) {
    case 'port':
      sorted.sort((a, b) => a.port - b.port)
      break
    case 'memory':
      sorted.sort((a, b) => (b.memoryKB ?? 0) - (a.memoryKB ?? 0))
      break
    case 'uptime':
      sorted.sort(
        (a, b) => uptimeToSeconds(b.uptime) - uptimeToSeconds(a.uptime)
      )
      break
    case 'name':
      sorted.sort((a, b) =>
        (a.projectName ?? 'zzz').localeCompare(b.projectName ?? 'zzz')
      )
      break
  }

  return sorted
}

function uptimeToSeconds(etime: string | null): number {
  if (!etime) return 0
  const trimmed = etime.trim()

  const dayMatch = trimmed.match(/^(\d+)-(\d+):(\d+):(\d+)$/)
  if (dayMatch) {
    return (
      parseInt(dayMatch[1]!, 10) * 86400 +
      parseInt(dayMatch[2]!, 10) * 3600 +
      parseInt(dayMatch[3]!, 10) * 60 +
      parseInt(dayMatch[4]!, 10)
    )
  }

  const fullMatch = trimmed.match(/^(\d+):(\d+):(\d+)$/)
  if (fullMatch) {
    return (
      parseInt(fullMatch[1]!, 10) * 3600 +
      parseInt(fullMatch[2]!, 10) * 60 +
      parseInt(fullMatch[3]!, 10)
    )
  }

  const shortMatch = trimmed.match(/^(\d+):(\d+)$/)
  if (shortMatch) {
    return parseInt(shortMatch[1]!, 10) * 60 + parseInt(shortMatch[2]!, 10)
  }

  return 0
}
