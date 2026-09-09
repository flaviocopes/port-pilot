export type Framework =
  | 'nextjs'
  | 'astro'
  | 'vite'
  | 'remix'
  | 'gatsby'
  | 'nuxt'
  | 'sveltekit'
  | 'angular'
  | 'node'
  | 'unknown'

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  nextjs: 'Next.js',
  astro: 'Astro',
  vite: 'Vite',
  remix: 'Remix',
  gatsby: 'Gatsby',
  nuxt: 'Nuxt',
  sveltekit: 'SvelteKit',
  angular: 'Angular',
  node: 'Node.js',
  unknown: '—',
}

export interface PortEntry {
  port: number
  pid: number
  command: string
  fullCommand: string | null
  cwd: string | null
  projectName: string | null
  framework: Framework
  user: string | null
  parentPid: number | null
  parentCommand: string | null
  processChain: string[]
  cpuPercent: number | null
  memoryKB: number | null
  uptime: string | null
  http: HttpHealth | null
  docker: DockerInfo | null
}

export type SortField = 'port' | 'memory' | 'uptime' | 'name'
export type FilterMode = 'all' | 'dev' | 'node'

export interface HttpHealth {
  reachable: boolean
  protocol: 'http' | 'https'
  url: string
  status: number | null
  title: string | null
  responseTimeMs: number | null
  error: string | null
}

export interface DockerInfo {
  containerId: string
  containerName: string
  image: string
  privatePort: number | null
}

export interface ScanOptions {
  probeHttp?: boolean
  httpTimeoutMs?: number
}

export interface PortFilters {
  dev?: boolean
  range?: { min: number; max: number }
  framework?: string
  project?: string
  user?: string
  query?: string
}
