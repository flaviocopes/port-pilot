# Port Pilot

This is one of the software packages I publish with full source. The landing page is [flaviocopes.com/software/port-pilot](https://flaviocopes.com/software/port-pilot/).

It is MIT licensed. You are free to use it, fork it and change it, also commercially.

There is no support. Issues, pull requests, discussions, and the wiki are turned off, and there is no roadmap. Forks are welcome.

If you point a coding agent at this repository, have it read `AGENTS.md` first.

## Table of contents

- [What Port Pilot does](#what-port-pilot-does)
- [What is included](#what-is-included)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Install](#install)
- [macOS menu bar companion](#macos-menu-bar-companion)
- [Interactive dashboard](#interactive-dashboard)
- [Commands](#commands)
  - [List and inspect](#list-and-inspect)
  - [Scriptable availability](#scriptable-availability)
  - [Safe stopping](#safe-stopping)
  - [Aliases and browser opening](#aliases-and-browser-opening)
  - [Lifecycle events](#lifecycle-events)
  - [Shell completions](#shell-completions)
- [Data model](#data-model)
- [Verification](#verification)
- [Structure](#structure)
- [Configuration and safety](#configuration-and-safety)
- [Architecture](#architecture)
- [How I built Port Pilot](#how-i-built-port-pilot)
- [Configuration](#configuration)
- [Distribution](#distribution)
- [Customization](#customization)
- [Security](#security)
- [Decisions](#decisions)
- [Changelog](#changelog)

## What Port Pilot does

See every local service, understand what launched it, check whether it is healthy, and stop it safely from a native macOS menu bar companion, interactive terminal dashboard, or agent-friendly CLI.

Port Pilot is a port-focused command center for developers and coding agents. It combines a native macOS menu bar companion, live terminal dashboard, and predictable commands with structured output.

## What is included

- Live terminal dashboard with search, filters, sorting, browser/editor actions, safe process stopping, and clipboard shortcuts
- Compact SwiftUI menu bar companion with instant cached startup, background refresh, dense service rows, in-panel details, native stop confirmation, aliases, lifecycle notifications, and launch at login
- Scriptable commands with JSON output, meaningful exit codes, aliases, wait conditions, and lifecycle watch events
- HTTP status, response time, page title, Docker mapping, process owner, resource use, and parent-process context
- macOS and Linux port scanners, shell completions, tests, and a reproducible TypeScript build
- Documentation covering architecture, configuration, security, customization, distribution, and the build story, all in this README

## Requirements

- Node.js 20 or newer
- npm
- macOS with `lsof` and `ps`, or Linux with `ss`/`lsof` and `ps`
- macOS 13 or newer plus Xcode/Swift to build the optional native companion
- Docker is optional; container context appears automatically when available

## Quick start

Clone the repository, then from its root:

```sh
npm install
npm run verify
npm link
ports
```

Useful non-interactive commands:

```sh
ports list
ports list --all
ports check 4321 --json
ports is-free 4321
ports wait 4321 --http 200
ports kill 4321
ports watch --json
ports watch --all --json
```

List, watch, the terminal dashboard, and the macOS companion show services with development evidence by default. Use `--all`, cycle the terminal filter, or turn on Show all in the companion when you need system and unknown listeners too.

Read the [Commands](#commands) section for the complete command reference.

To run the macOS companion after installing the CLI:

```sh
cd macos/PortPilotMenuBar
swift test
./scripts/build-app.sh
open ".build/release/Port Pilot.app"
```

Read `macos/PortPilotMenuBar/README.md` for its architecture and distribution notes.

## Install

```sh
npm install
npm run verify
npm link
```

Node.js 20+ is required. Port scanning supports macOS (`lsof`) and Linux (`ss`, with `lsof` fallback). Docker context is optional.

## macOS menu bar companion

After installing the CLI, build the native companion on macOS 13 or newer:

```sh
cd macos/PortPilotMenuBar
swift test
./scripts/build-app.sh
open ".build/release/Port Pilot.app"
```

The compact SwiftUI app provides a development-first service list, search and Show all controls, in-panel details, browser/editor/Finder and clipboard actions, native safe-stop confirmation, shared alias management, lifecycle notifications, and launch at login. It calls the CLI's JSON commands rather than duplicating scanning or termination logic.

Read `macos/PortPilotMenuBar/README.md` for CLI discovery, development, signing, and distribution details.

## Interactive dashboard

Run `ports` without arguments. The dashboard refreshes automatically and starts with services identified by project, framework, development-runtime, or Docker evidence, showing port, project, framework, PID, owner, memory, uptime, HTTP health, command, process-chain context, and Docker ownership. Press `f` to reach the all-port view.

| Key | Action |
| --- | --- |
| `↑`/`↓`, `j`/`k` | Navigate |
| `K` | Preview and confirm stopping the selected process tree |
| `o` | Open the detected local URL |
| `e` | Open the project directory in Cursor, VS Code, or the system default |
| `u` | Copy URL |
| `p` | Copy port |
| `c` | Copy command |
| `d` | Copy directory |
| `f` | Cycle all, development, and Node filters |
| `s` | Cycle port, memory, uptime, and project sorting |
| `/` | Search visible process metadata |
| `r` | Refresh |
| `q` | Quit |

## Commands

### List and inspect

```sh
ports list
ports list --range 3000-9999
ports list --framework astro --project docs
ports list --all
ports list --all --user flavio --search worker
ports list --json
ports list --plain --no-http

ports check 4321
ports check api --json
```

HTTP-aware records include the protocol, response status, response time, final URL, and HTML title. Common database and messaging ports are not probed.

`list` returns identified development services by default, including detected projects/frameworks, common development runtimes, and Docker-published services. Port number alone is not treated as development evidence. Add `--all` to include system, unknown, and unrelated listeners. `--dev` remains accepted as a backwards-compatible explicit form of the default.

### Scriptable availability

```sh
ports is-free 4321
```

`is-free` exits with status `0` when free and `1` when occupied.

```sh
ports wait 4321 --ready
ports wait 4321 --free
ports wait 4321 --http 200 --timeout 60
ports wait 4321 --http 200 --json
```

### Safe stopping

```sh
ports kill 4321
ports kill api --signal INT
ports kill 4321 --yes --json
```

The interactive form displays the process, project, directory, command, and process chain before confirmation. Port Pilot signals descendants before the owning process, begins with `SIGTERM` by default, and uses `SIGKILL` only when processes remain after the grace period. Automation must opt in with `--yes`.

### Aliases and browser opening

```sh
ports alias api 8787
ports alias
ports check api
ports open api
ports alias --remove api
```

Aliases are stored in the user configuration directory, outside project source.

### Lifecycle events

```sh
ports watch
ports watch --json
ports watch --http --interval 2000
ports watch --all --json
```

Watch mode follows development services by default and emits an initial snapshot, followed by `started`, `stopped`, and `changed` events. Add `--all` to watch every listener. JSON mode writes one complete JSON value per event.

### Shell completions

```sh
ports completion zsh > ~/.zfunc/_ports
ports completion bash > ~/.local/share/bash-completion/completions/ports
ports completion fish > ~/.config/fish/completions/ports.fish
```

## Data model

Both the TUI and commands receive the same `PortEntry` records. Each record can include:

- port, PID, user, command, working directory, project, and detected framework
- CPU, memory, uptime, parent PID, parent command, and a compact process chain
- HTTP URL, status, title, and response time
- Docker container name, image, and public/private port mapping

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run verify
cd macos/PortPilotMenuBar && swift test
```

For a release smoke test, start a disposable local HTTP server, exercise `wait`, `check`, and filtered `list`, then stop it with `kill --yes` and confirm the port becomes free.

## Structure

```text
src/
├── commands/       CLI command handlers
├── lib/            scanners, filters, health, Docker, config, output, safety
├── tui/            Ink dashboard and terminal components
├── index.ts        Commander entry point and TUI fallback
└── types.ts        shared records and options
macos/PortPilotMenuBar/
├── Sources/        SwiftUI app and reusable PortPilotKit
├── Tests/          model, filter, and CLI discovery tests
└── scripts/        reproducible .app bundle builder
```

## Configuration and safety

Port Pilot requires no API keys, accounts, database, or hosted service. Read [Configuration](#configuration) and [Security](#security) before changing termination behavior or adding integrations.

## Architecture

Port Pilot has three interfaces over one typed port-scanning pipeline: Commander commands for scripts and agents, an Ink/React terminal dashboard, and a native SwiftUI menu bar companion for macOS. The Node.js CLI remains the engine for every interface.

### Entry points

`src/index.ts` configures Commander. With no subcommand it lazy-loads the Ink dashboard; otherwise it calls a handler in `src/commands/`.

`macos/PortPilotMenuBar/Sources/PortPilotMenuBar/PortPilotMenuBarApp.swift` starts a SwiftUI `MenuBarExtra`. Its `PortPilotKit` dependency owns models, CLI execution, cached startup state, background refresh, notifications, login-item registration, and native views.

### Shared scanner and data flow

`scanPorts()` is the single source of port records:

1. `src/lib/scan.ts` selects the macOS `lsof` adapter or the Linux `ss` adapter (with `lsof` fallback), then parses and deduplicates PID/port pairs.
2. `src/lib/process-info.ts` reads one process table, resolves working directories, detects projects/frameworks, and adds owner, resource, and ancestry metadata (parent chains).
3. `src/lib/docker.ts` optionally maps published ports to containers.
4. `src/lib/http-health.ts` probes likely web listeners with a bounded HTTP/HTTPS request and strict timeouts.
5. The scanner returns complete `PortEntry` records to `src/commands/` or `src/tui/`.

All optional context is nullable. Failure to inspect one field does not hide the listening port.

The TUI and commands never implement their own scanning rules. Shared development-service detection requires project, framework, development-runtime, or Docker evidence; port number alone is not enough. Filters, JSON serialization, aliases, clipboard access, and process termination remain separate library boundaries.

### Command layer

Command modules handle presentation and command-specific policy. Shared filters and JSON serialization prevent output rules from being copied. Alias resolution happens before commands inspect a target.

`is-free`, `wait`, and `watch` are designed for agents and scripts. `list` and `watch` use shared development-service detection by default and accept `--all`; direct port commands remain unfiltered. `list` and `check` support complete JSON records. `open` uses the detected working URL. Completion output is generated without modifying the shell.

### Safety boundary

`src/lib/terminate.ts` owns destructive behavior. It discovers descendants, signals leaf processes before the root listener, and escalates only after a grace period. CLI and TUI confirmation happen before entering this boundary: the CLI requires confirmation unless `--yes` is explicit, and the TUI requires a second confirmation key. The macOS app displays a native confirmation sheet with port, PID, project, command, path, and ancestry before it is allowed to invoke `kill --yes --json`.

### TUI

The dashboard owns navigation, sorting, local filtering, search, confirmation state, browser/editor actions, and clipboard shortcuts. It does not implement scanning or termination directly.

### macOS companion

The Swift package in `macos/PortPilotMenuBar/` separates reusable models and services into `PortPilotKit` and keeps the SwiftUI `MenuBarExtra` entry point small.

`PortPilotCLI` (in `CLIClient.swift`) locates and executes the installed `ports` binary with an explicit `PATH`, then requests the complete `ports list --all --json` record set. `PortStore` restores its last successful snapshot, begins polling `ports list --all --json` as soon as the app launches, refreshes the visible list in place, defaults the compact list to development services, drives its Show all toggle, shares aliases through CLI commands, diffs snapshots to detect start/stop/health changes for lifecycle notifications, and invokes safe-stop only after the in-panel detail view's native confirmation. It never reparses operating-system command output or terminates a process directly.

The companion performs native-only presentation work: macOS notifications, workspace actions, user defaults, and `SMAppService` launch at login. It never invokes `lsof`, `ps`, Docker, or signals directly.

Finder-launched apps do not receive a complete interactive shell `PATH`. The companion therefore checks common npm/Homebrew locations and stores an explicitly selected `ports` executable path. The generated app uses `LSUIElement` to remain a menu bar utility and `SMAppService` for opt-in launch at login.

### Persistent state

Live operating-system state remains authoritative. Only optional aliases persist, in `$XDG_CONFIG_HOME/port-pilot/config.json` or `~/.config/port-pilot/config.json`.

### Platform support

- macOS: `lsof`, `ps`, and `pbcopy`
- Linux: `ss` with `lsof` fallback, `ps`, and an available clipboard provider (`wl-copy`, `xclip`, or `xsel`)
- Docker metadata is best-effort and never required

Windows needs a new scanner/process/clipboard adapter; it should not be added by branching behavior throughout commands.

### Tests

Vitest covers OS parser fixtures, deduplication, filters, port ranges, HTTP-title parsing, non-HTTP exclusions, and Docker port mappings. `npm run verify` adds strict TypeScript validation and the production bundle. Swift Testing covers CLI JSON decoding, native filtering, and executable discovery; `scripts/build-app.sh` performs a release build, creates the menu-only app bundle, and applies a local signature.

## How I built Port Pilot

This section explains how I approached the software. It is not a generated API reference. It is the story of the build: what I did first, why the architecture looks this way, what was difficult, and what I would change next.

### The starting point

Port Pilot started from a tiny daily annoyance: a development server says the port is busy, then I have to remember several process commands. I wanted one command that showed enough context to stop the right process safely.

My rule was to get one complete path working before adding breadth. A complete path gives us something we can run, inspect, and improve. A collection of disconnected features does not.

### The build sequence

1. I began by wrapping `lsof` and turning its output into typed port records. Accurate discovery came before the terminal interface.
2. I enriched each record with command, working directory, ownership, parent chain, CPU, memory, and uptime from `ps` and related system information.
3. I separated scanning from commands so the same records could power both scripted output and an interactive dashboard.
4. I added Commander subcommands for direct automation and Ink components for the keyboard-driven interface.
5. I added bounded HTTP probing and optional Docker metadata without making either one necessary for a useful port record.
6. I made automation a first-class interface through JSON output, availability exit codes, aliases, waits, and lifecycle events.
7. I isolated destructive behavior behind confirmation and process-tree termination. Graceful signals always come before force.
8. I added macOS and Linux adapters, parser tests, type checking, and a live disposable-process verification flow before bundling with tsup.
9. I added a native SwiftUI menu bar companion as a thin client over the CLI JSON contract. This kept scanning and process termination in one tested engine while translating command semantics into native lists, confirmations, notifications, and settings.

This order matters. Each step depends on a smaller working system underneath it. If you rebuild the software in another stack, keep the sequence even when the files and frameworks change.

### The parts that needed the most care

- System command output varies between operating systems. The parser and process adapters are isolated and tested with fixture output so platform support can evolve.
- Killing the wrong PID is expensive. The interface keeps port, command, path, PID, and ancestry visible, requires confirmation, and makes automation opt in explicitly.
- Interactive and non-interactive modes can diverge. Both consume the same scanner and process records.
- A native companion can drift into a second implementation. The app deliberately calls the CLI instead of duplicating `lsof`, `ps`, Docker, HTTP, or process-tree rules in Swift.
- Enrichment can fail for a protected process, stopped Docker daemon, or non-HTTP listener. A partial record must remain visible instead of disappearing.

These are the areas I would inspect first when changing the product. They contain more product behavior than their file size suggests.

### How I verified the build

I did not treat a successful compilation as the finish line. I used the real product flow:

1. Run type checking and parser/filter/health tests on every change.
2. Start a disposable HTTP server and verify filtered list output, JSON inspection, page-title health, readiness waiting, and process ancestry.
3. Stop only that disposable process with explicit non-interactive approval and confirm the port becomes free.
4. Run the compiled CLI outside the repository and finish with a clean production build.
5. Run the Swift tests and app-bundling script, then connect the companion to the compiled CLI and verify refresh, inspection, aliases, checking, and confirmation without granting unintended destructive authority.

When you make a structural change, repeat the same journey. Add a focused automated test when the change introduces a rule that is easy to break.

### How to study the source

Start with the [Commands](#commands) reference, then read [Architecture](#architecture) and [Decisions](#decisions). Open the implementation areas listed there and trace one user action from the interface to its data or system boundary.

Do not read every file in order. Follow behavior. For example, start from a form, route, or command. Find the function it calls. Then find where that function reads or writes data.

After that, run the unmodified project. Change one visible detail. Run it again. Small changes build a much better mental model than a large rewrite on day one.

### What I would do next

- I would add a formal Windows adapter without weakening the macOS/Linux boundaries.
- I would add opt-in team alias import/export while keeping live system state authoritative.
- I would sign and notarize a branded binary distribution while keeping the source build available.
- I would keep Port Pilot focused on ports rather than turning it into a general system monitor or reverse proxy.

Those are directions, not requirements. The current software is intentionally a starting point. Keep the parts that support your product and replace the rest.

### Rebuilding it in another stack

If you want to rewrite this software, preserve these four things first:

1. The domain records and the rules connecting them.
2. The main user journey from input to useful result.
3. The trust boundaries around users, secrets, payments, and external services.
4. The verification journey described above.

Frameworks are replaceable. Product behavior is the valuable part.

My advice is to keep the original version running beside the rewrite. Move one complete path at a time. Compare the two versions with the same inputs before removing the old path.

## Configuration

Port Pilot requires no environment variables, API keys, accounts, database, or external service.

### Aliases

Create and remove aliases with the CLI:

```sh
ports alias api 8787
ports alias --remove api
```

Aliases are stored with user-only file permissions in:

- `$XDG_CONFIG_HOME/port-pilot/config.json` when `XDG_CONFIG_HOME` is set
- `~/.config/port-pilot/config.json` otherwise

The file contains port numbers only. It must never contain credentials.

### Optional system tools

- Docker adds container context when the Docker CLI is installed and running.
- Linux clipboard actions try `wl-copy`, `xclip`, then `xsel`.
- HTTP probing can be disabled with `ports list --no-http`.

Platform commands and timeouts are isolated in `src/lib/`; keep new configuration typed and documented.

### macOS companion preferences

The menu bar app stores these non-sensitive preferences in macOS user defaults:

- resolved `ports` executable path
- refresh interval
- the last successful port and alias snapshot, used only to populate the menu while the startup refresh runs
- system/privileged port visibility
- lifecycle notification preference

The app searches common Homebrew and npm locations, but its Settings screen also provides auto-detection and a file picker. Launch at login is registered only when the user enables it.

## Distribution

Port Pilot is a local CLI and macOS companion, not a hosted service.

### Local or team installation

```sh
npm install
npm run verify
npm link
```

Teams can distribute the source privately, publish a scoped npm package, or create a Homebrew formula around a packaged release. Keep the `ports` binary mapping to `dist/index.js` and require Node.js 20+.

### Before publishing

1. Run `npm ci` and `npm run verify` on macOS and Linux.
2. Exercise `list`, `check`, `is-free`, `wait`, `watch`, aliases, completions, and a disposable `kill --yes` flow.
3. Confirm the repository and any published package exclude `node_modules`, `dist`, user configuration, logs, and local process data.
4. Verify `package.json`, command output, the changelog, and public copy all report the same version (currently 1.0.0).

Never ask users to run Port Pilot with elevated privileges by default.

### macOS companion build

For a local source build:

```sh
cd macos/PortPilotMenuBar
swift test
./scripts/build-app.sh
open ".build/release/Port Pilot.app"
```

The generated app is ad-hoc signed and suitable for local development. Before distributing a prebuilt app, set a Developer ID identity, archive the `.app`, submit it for Apple notarization, staple the ticket, and verify it with `codesign` and `spctl`. Building from source does not require an Apple developer account.

## Customization

Good first extensions include:

- additional framework and project detection
- a Windows scanner/process adapter
- custom port groups and team alias presets
- container engines beyond Docker
- alternate HTTP readiness rules
- new JSON event consumers or editor integrations
- TUI columns, themes, filters, and keyboard shortcuts
- menu bar sections, service grouping, notification rules, editor choices, and status-item presentation

Keep the scanner as the single source of `PortEntry` records. Add OS-specific behavior behind library adapters, preserve confirmation for destructive actions, and add parser tests using captured non-private fixture text.

Keep the native companion behind the CLI JSON boundary rather than adding operating-system scanners in Swift. Run `npm run verify` for CLI changes and `swift test` plus `scripts/build-app.sh` for companion changes. Update both interfaces when JSON fields or destructive action rules change.

## Security

### Process termination

- Keep the full process context visible before stopping anything.
- Preserve confirmation in both CLI and TUI flows.
- Require `--yes` for automation; structured output does not imply consent.
- Restrict supported signals to `SIGINT`, `SIGTERM`, and `SIGKILL`.
- Signal discovered descendants before the owning listener and escalate only after a grace period.
- Do not run Port Pilot with `sudo` unless the user has independently verified the target process.

### Local inspection

- Process commands and directories can contain sensitive names. JSON and watch output go only to stdout and are never persisted by Port Pilot.
- HTTP probes target localhost, use short timeouts, and skip common non-HTTP service ports.
- Docker and process enrichment are optional and fail closed to missing metadata.
- Alias configuration contains names and ports only and is written with user-only permissions.
- The macOS companion never sends signals itself. Its destructive action shows native target context and invokes `kill --yes --json` only after explicit confirmation.
- The companion stores preferences, the executable path, and the last successful local service snapshot in macOS user defaults so startup can render immediately. Notification text contains only the port and visible process/project label.
- Source builds are ad-hoc signed for local use. Public binary distribution should use Developer ID signing and notarization; do not weaken Gatekeeper instructions.

### Release checklist

- Run type checks, automated tests, and the disposable-process smoke test.
- Audit the repository for credentials, personal paths, configuration, dependencies, build output, and logs.
- Review every new process action as destructive code.
- Test platform parsers using fixtures and verify supported platforms directly.
- Run Swift tests and inspect the generated app bundle's signature, identifier, minimum macOS version, and `LSUIElement` setting.

## Decisions

### Live state over a service database

Port Pilot reads the current operating-system state on demand. Only aliases persist. This keeps inspection accurate and the product local-first.

### One record model for TUI and CLI

Both interfaces consume `PortEntry`. Adding Docker or HTTP context once makes it available everywhere and prevents interactive/script behavior from drifting.

### Best-effort enrichment

A listener remains useful when its working directory, process table, Docker daemon, or HTTP endpoint is unavailable. Optional enrichment returns `null` rather than hiding the port.

### Explicit destructive authority

Stopping a process requires confirmation. Non-interactive callers must pass `--yes`; JSON output alone never grants destructive authority. Descendants are handled before the owning PID and graceful signals precede force.

### Platform adapters

macOS and Linux parsers live behind the scanner boundary. Future Windows support belongs in a new adapter rather than conditional logic spread across commands.

### Native UI over the CLI contract

The macOS companion consumes CLI JSON instead of implementing port discovery or process termination in Swift. This adds a native daily interface without creating a second safety engine that can drift. It requires an installed CLI and explicit executable discovery, which is preferable to silently diverging behavior.

### Swift Package plus reproducible app bundling

The companion uses Swift Package Manager so you can open it in Xcode, test it from the terminal, or reuse `PortPilotKit`. A small build script creates the `LSUIElement` app bundle and ad-hoc signs local builds. A signed binary distribution can add Developer ID signing and notarization without changing the source architecture.

## Changelog

### 1.0.0 (2026-08-02)

- Added the interactive port dashboard and scriptable CLI, defaulting visible results to development services with explicit all-port modes.
- Added project/framework detection, process ownership and ancestry, CPU, memory, and uptime context.
- Added HTTP health checks, Docker port mapping, filters, search, JSON output, and script-friendly exit codes.
- Added safe process-tree termination with confirmation, signal selection, and explicit non-interactive approval.
- Added aliases, browser opening, readiness/free/HTTP waits, lifecycle watch events, clipboard actions, and shell completions.
- Added macOS and Linux scanning adapters, automated tests, type checking, and a reproducible production build.
- Added a compact native macOS menu bar companion with dense service rows, search and Show all controls, in-panel process/HTTP/Docker details, browser/editor/clipboard actions, safe native stop confirmation, shared aliases, lifecycle notifications, in-menu CLI re-detection, launch at login, tests, and an app-bundling script.
- Added launch-time background scanning and immediate cached results so the native menu opens populated while refreshing in place.
- Limited the default development view to listeners with project, framework, development-runtime, or Docker evidence; system and unknown listeners remain available through explicit all-port modes.
