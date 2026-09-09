# Port Pilot for macOS

The Port Pilot menu bar companion is a compact native SwiftUI interface over the existing `ports` CLI. It restores the last successful service snapshot immediately, refreshes from app startup, shows live services in dense rows, opens details inside the same menu, manages aliases, and confirms the exact target before asking the CLI to stop a process tree.

## Requirements

- macOS 13 or newer
- Xcode 15 or newer, or a compatible Swift toolchain
- The Port Pilot CLI built and installed with `npm link`

The companion intentionally does not duplicate port scanning or termination in Swift. The CLI remains the source of truth and the app consumes its structured JSON output.

## Run during development

Build and install the CLI first from the repository root:

```sh
npm install
npm run build
npm link
```

Then run the companion:

```sh
cd macos/PortPilotMenuBar
swift test
swift run PortPilotMenuBar
```

If the app cannot find `ports`, open Settings inside the menu and choose the executable. Finder-launched applications do not inherit the shell's complete `PATH`, so the selected path is stored in user defaults.

## Build the app bundle

```sh
./scripts/build-app.sh
open ".build/release/Port Pilot.app"
```

The script creates a local ad-hoc-signed menu bar app with `LSUIElement` enabled, so it does not add a Dock icon. For distribution outside source form, replace the ad-hoc signature with a Developer ID signature and notarize the archive.

## App features

- Development services by default, with a single Show all toggle and optional search
- Immediate cached results with continuous background refresh from app startup
- Dense rows for port, project, runtime, uptime, CPU, memory, and HTTP status
- In-panel navigation for service details, aliases, and settings
- HTTP health, process ownership, resource use, framework, project, command, ancestry, and Docker details
- Browser, editor/Finder, and clipboard actions
- Native confirmation before safe process-tree stopping
- Shared CLI aliases
- Start, stop, and HTTP health-change notifications
- Configurable refresh interval and system-port visibility
- Automatic CLI discovery with an in-menu check-again action after installation
- Launch at login through `SMAppService`

Shell completions, JSON printing, and exit codes remain CLI concepts. Their user-facing equivalents in the app are native controls, status displays, and notifications.

## Structure

```text
Sources/
├── PortPilotKit/
│   ├── CLIClient.swift       CLI discovery and structured command adapter
│   ├── Models.swift          JSON records and filters
│   ├── PortStore.swift       refresh, lifecycle diffing, aliases, and actions
│   ├── Services.swift        workspace, notifications, and login item APIs
│   └── Views/                compact menu, detail, alias, and settings UI
└── PortPilotMenuBar/
    └── PortPilotMenuBarApp.swift
```
