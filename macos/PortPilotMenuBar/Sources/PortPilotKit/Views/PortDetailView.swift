import SwiftUI

public struct PortDetailView: View {
    @EnvironmentObject private var store: PortStore
    public let entry: PortEntry
    public let onClose: () -> Void
    @State private var confirmingStop = false
    @State private var isStopping = false

    public init(entry: PortEntry, onClose: @escaping () -> Void) {
        self.entry = entry
        self.onClose = onClose
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    if let status = entry.http?.status {
                        Label("HTTP \(status)", systemImage: status < 400 ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .foregroundStyle(status < 400 ? .green : .orange)
                    } else {
                        Text(entry.healthDescription).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text("PID \(entry.pid)").foregroundStyle(.secondary)
                }
                .font(.callout)

                HStack(spacing: 8) {
                    Button("Open", systemImage: "safari") { Task { await store.openService(entry) } }
                        .disabled(entry.http == nil)
                    Menu("Copy", systemImage: "doc.on.doc") {
                        Button("URL") { WorkspaceActions.copy(entry.http?.url ?? "http://localhost:\(entry.port)") }
                        Button("Port") { WorkspaceActions.copy(String(entry.port)) }
                        Button("Command") { WorkspaceActions.copy(entry.fullCommand ?? entry.command) }
                        if let cwd = entry.cwd { Button("Project path") { WorkspaceActions.copy(cwd) } }
                    }
                    if let cwd = entry.cwd {
                        Button("Project", systemImage: "folder") { WorkspaceActions.openProject(cwd) }
                        Button { WorkspaceActions.reveal(cwd) } label: { Image(systemName: "finder") }
                            .help("Reveal in Finder")
                    }
                }
                .buttonStyle(.bordered)

                Divider()
                Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 7) {
                    detail("User", entry.user ?? "—")
                    detail("Framework", entry.framework == "unknown" ? "—" : entry.framework)
                    detail("CPU", entry.cpuPercent.map { String(format: "%.1f%%", $0) } ?? "—")
                    detail("Memory", entry.memoryKB.map { ByteCountFormatter.string(fromByteCount: Int64($0) * 1024, countStyle: .memory) } ?? "—")
                    detail("Uptime", entry.uptime ?? "—")
                    if let title = entry.http?.title { detail("Page", title) }
                    if let docker = entry.docker { detail("Container", "\(docker.containerName) · \(docker.image)") }
                }

                Divider()
                detailBlock("Command", entry.fullCommand ?? entry.command)
                if let cwd = entry.cwd { detailBlock("Directory", cwd) }
                if entry.processChain.count > 1 { detailBlock("Process chain", entry.processChain.joined(separator: " → ")) }

                Button("Stop Service…", systemImage: "stop.circle", role: .destructive) {
                    confirmingStop = true
                }
                .disabled(isStopping)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(14)
        }
        .alert("Stop the process tree on port \(entry.port)?", isPresented: $confirmingStop) {
            Button("Cancel", role: .cancel) {}
            Button("Stop Service", role: .destructive) {
                isStopping = true
                Task {
                    if await store.stopService(entry) { onClose() }
                    isStopping = false
                }
            }
        } message: {
            Text("Port Pilot will stop PID \(entry.pid) and its descendants gracefully, forcing only processes that remain after the grace period.")
        }
    }

    @ViewBuilder
    private func detail(_ label: String, _ value: String) -> some View {
        GridRow {
            Text(label).foregroundStyle(.secondary)
            Text(value).textSelection(.enabled)
        }
    }

    private func detailBlock(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
        }
    }
}
