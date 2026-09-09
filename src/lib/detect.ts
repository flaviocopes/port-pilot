import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Framework } from '../types.js'

export function detectFramework(projectPath: string): Framework {
  const pkgPath = join(projectPath, 'package.json')
  if (!existsSync(pkgPath)) return 'unknown'

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }

    if (allDeps['next']) return 'nextjs'
    if (allDeps['astro']) return 'astro'
    if (allDeps['@remix-run/dev'] || allDeps['@remix-run/react']) return 'remix'
    if (allDeps['gatsby']) return 'gatsby'
    if (allDeps['nuxt'] || allDeps['nuxt3']) return 'nuxt'
    if (allDeps['@sveltejs/kit']) return 'sveltekit'
    if (allDeps['@angular/core']) return 'angular'
    if (allDeps['vite']) return 'vite'

    if (
      existsSync(join(projectPath, 'vite.config.ts')) ||
      existsSync(join(projectPath, 'vite.config.js'))
    ) {
      return 'vite'
    }

    if (pkg.main || pkg.scripts?.start) return 'node'

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function getFrameworkVersion(
  projectPath: string,
  framework: Framework
): string | null {
  const pkgPath = join(projectPath, 'package.json')
  if (!existsSync(pkgPath)) return null

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

    const depMap: Partial<Record<Framework, string>> = {
      nextjs: 'next',
      astro: 'astro',
      remix: '@remix-run/dev',
      gatsby: 'gatsby',
      nuxt: 'nuxt',
      sveltekit: '@sveltejs/kit',
      angular: '@angular/core',
      vite: 'vite',
    }

    const depName = depMap[framework]
    if (depName && allDeps[depName]) {
      return allDeps[depName].replace(/[\^~]/, '')
    }
    return null
  } catch {
    return null
  }
}
