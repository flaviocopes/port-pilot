# AI agent guide

This repository contains the Port Pilot CLI (Node.js/TypeScript, in `src/`) and the native macOS companion (SwiftUI, in `macos/PortPilotMenuBar/`). The code sits at the repository root. `README.md` is the single project document: command reference, architecture, configuration, security, decisions, and changelog.

## Working rules

- Read the [Commands](README.md#commands), [Architecture](README.md#architecture), and [Decisions](README.md#decisions) sections of `README.md` before structural changes.
- Work at the repository root: `src/` holds the CLI, `macos/PortPilotMenuBar/` holds the companion.
- Preserve the existing stack unless the user explicitly requests a migration.
- Keep secrets in ignored local environment files and never commit real values.
- Run the documented verification commands after changes (`npm run verify`, and `swift test` in `macos/PortPilotMenuBar/` for companion changes).
- Update `README.md` when configuration, architecture, or distribution changes.
- Do not commit generated dependencies, databases, uploads, logs, or build output.

## Project focus

A port-focused command center for seeing every local service, understanding what launched it, checking its health, and stopping it safely through a TUI or agent-friendly CLI.

The main implementation areas are:

- `src/lib/scan.ts` selects macOS/Linux adapters and discovers listening ports.
- `src/lib/process-info.ts` enriches processes with ownership, ancestry, path, CPU, memory, and uptime.
- `src/lib/http-health.ts` and `src/lib/docker.ts` add optional service context.
- `src/lib/terminate.ts` is the only destructive process boundary; preserve its confirmation model.
- `src/commands/` implements non-interactive CLI commands.
- `src/tui/` renders the Ink terminal interface and keyboard actions.
- `macos/PortPilotMenuBar/` contains the SwiftUI menu bar companion. Keep it as a client of CLI JSON and never duplicate process termination in Swift.
