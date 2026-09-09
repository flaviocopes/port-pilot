import type { HttpHealth } from '../types.js'

const NON_HTTP_PORTS = new Set([
  22, 25, 53, 110, 143, 465, 587, 993, 995, 1883, 3306, 5432, 5672, 6379,
  27017,
])

export function shouldProbeHttp(port: number): boolean {
  return port >= 80 && !NON_HTTP_PORTS.has(port)
}

export async function probeHttp(
  port: number,
  timeoutMs = 450
): Promise<HttpHealth | null> {
  if (!shouldProbeHttp(port)) return null

  for (const protocol of ['http', 'https'] as const) {
    const url = `${protocol}://localhost:${port}`
    const startedAt = performance.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { accept: 'text/html,application/xhtml+xml,*/*;q=0.1' },
      })
      const contentType = response.headers.get('content-type') ?? ''
      let title: string | null = null
      if (contentType.includes('text/html')) {
        const reader = response.body?.getReader()
        if (reader) {
          const firstChunk = await reader.read()
          await reader.cancel()
          title = extractHtmlTitle(
            new TextDecoder().decode(firstChunk.value ?? new Uint8Array())
          )
        }
      } else {
        await response.body?.cancel()
      }
      return {
        reachable: true,
        protocol,
        url: response.url || url,
        status: response.status,
        title,
        responseTimeMs: Math.round(performance.now() - startedAt),
        error: null,
      }
    } catch (error) {
      if (protocol === 'https') {
        return {
          reachable: false,
          protocol,
          url,
          status: null,
          title: null,
          responseTimeMs: null,
          error: error instanceof Error ? error.message : 'Probe failed',
        }
      }
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}

export function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null
  return match[1]!.replace(/\s+/g, ' ').trim().slice(0, 120) || null
}
