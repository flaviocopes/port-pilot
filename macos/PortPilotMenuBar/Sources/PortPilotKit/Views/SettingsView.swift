import SwiftUI

public struct SettingsView: View {
    @EnvironmentObject private var store: PortStore
    @State private var launchAtLogin = LoginItemService.isEnabled
    @State private var loginError: String?

    public init() {}

    public var body: some View {
        Form {
            Section("CLI connection") {
                TextField("Executable", text: $store.cliPath)
                    .font(.system(.body, design: .monospaced))
                HStack {
                    Button("Auto-detect") { store.autoLocateCLI() }
                    Button("Choose…") { store.chooseCLIExecutable() }
                    Spacer()
                    if FileManager.default.isExecutableFile(atPath: store.cliPath) {
                        Label("Connected", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                    } else {
                        Label("Not found", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange)
                    }
                }
                Text("Finder-launched apps do not inherit your shell PATH, so Port Pilot stores the explicit executable location.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Section("Refresh and visibility") {
                Picker("Refresh every", selection: $store.refreshInterval) {
                    Text("1 second").tag(1.0)
                    Text("2 seconds").tag(2.0)
                    Text("3 seconds").tag(3.0)
                    Text("5 seconds").tag(5.0)
                    Text("10 seconds").tag(10.0)
                }
                Toggle("Include privileged development services", isOn: $store.showSystemPorts)
            }

            Section("Notifications") {
                Toggle("Service start, stop, and HTTP health changes", isOn: Binding(
                    get: { store.lifecycleNotifications },
                    set: { value in Task { await store.enableLifecycleNotifications(value) } }
                ))
            }

            Section("macOS") {
                Toggle("Launch Port Pilot at login", isOn: Binding(
                    get: { launchAtLogin },
                    set: updateLoginItem
                ))
                if let loginError { Text(loginError).font(.caption).foregroundStyle(.red) }
                Text("Launch at login requires running the bundled .app rather than swift run.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding(8)
    }

    private func updateLoginItem(_ enabled: Bool) {
        do {
            try LoginItemService.setEnabled(enabled)
            launchAtLogin = LoginItemService.isEnabled
            loginError = nil
        } catch {
            launchAtLogin = LoginItemService.isEnabled
            loginError = error.localizedDescription
        }
    }
}
