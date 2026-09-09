import AppKit
import SwiftUI

public struct MainPanel: View {
    @EnvironmentObject private var store: PortStore
    @State private var destination: PanelDestination = .services
    @State private var searchIsVisible = false

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            content
            Divider()
            footer
        }
        .frame(width: 470, height: 520)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    @ViewBuilder
    private var header: some View {
        switch destination {
        case .services:
            HStack(spacing: 12) {
                Text("Ports").font(.title3.bold())
                Spacer()
                Button {
                    searchIsVisible.toggle()
                    if !searchIsVisible { store.search = "" }
                } label: {
                    Image(systemName: "magnifyingglass")
                }
                .buttonStyle(.plain)
                .foregroundStyle(searchIsVisible ? .primary : .secondary)
                .help("Search services")
                Toggle("Show all", isOn: Binding(
                    get: { store.filter == .all },
                    set: { store.filter = $0 ? .all : .development }
                ))
                .toggleStyle(.switch)
                .controlSize(.small)
                .fixedSize()
            }
            .padding(.horizontal, 14)
            .frame(height: 48)
        case .detail(let entry):
            compactBackHeader(title: entry.title, trailing: ":\(entry.port)")
        case .aliases:
            compactBackHeader(title: "Aliases")
        case .settings:
            compactBackHeader(title: "Settings")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch destination {
        case .services:
            ServicesView(searchIsVisible: $searchIsVisible) { entry in
                destination = .detail(entry)
            }
        case .detail(let entry):
            PortDetailView(entry: entry) { destination = .services }
        case .aliases:
            AliasesView()
        case .settings:
            SettingsView()
        }
    }

    private var footer: some View {
        HStack(spacing: 18) {
            Button { destination = .aliases } label: { Label("Aliases", systemImage: "tag") }
            Button { destination = .settings } label: { Label("Settings", systemImage: "gearshape") }
            Spacer()
            Button("Quit") { NSApplication.shared.terminate(nil) }
        }
        .buttonStyle(.plain)
        .foregroundStyle(.secondary)
        .font(.callout)
        .padding(.horizontal, 14)
        .frame(height: 40)
    }

    private func compactBackHeader(title: String, trailing: String? = nil) -> some View {
        HStack(spacing: 10) {
            Button { destination = .services } label: {
                Image(systemName: "chevron.left")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            Text(title).font(.headline).lineLimit(1)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.system(.callout, design: .monospaced, weight: .semibold))
                    .foregroundStyle(.blue)
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
    }
}

private enum PanelDestination: Hashable {
    case services
    case detail(PortEntry)
    case aliases
    case settings
}

private struct ServicesView: View {
    @EnvironmentObject private var store: PortStore
    @Binding var searchIsVisible: Bool
    let onSelect: (PortEntry) -> Void

    var body: some View {
        VStack(spacing: 0) {
            if searchIsVisible {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                    TextField("Port, project, or command", text: $store.search)
                        .textFieldStyle(.plain)
                    if !store.search.isEmpty {
                        Button { store.search = "" } label: { Image(systemName: "xmark.circle.fill") }
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 14)
                .frame(height: 38)
                .background(Color(nsColor: .controlBackgroundColor))
                Divider()
            }

            if store.cliPath.isEmpty {
                EmptyState(
                    title: "Connect the CLI",
                    systemImage: "terminal",
                    description: "Install Port Pilot with npm link, then check again."
                ) {
                    Button("Check Again", systemImage: "arrow.clockwise") {
                        store.autoLocateCLI()
                    }
                }
            } else if store.visibleEntries.isEmpty && !store.isRefreshing {
                EmptyState(
                    title: store.search.isEmpty ? "No development services" : "No search results",
                    systemImage: "checkmark.circle",
                    description: store.search.isEmpty ? "Turn on Show all to see every listener." : "Try another search."
                ) { EmptyView() }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(store.visibleEntries.enumerated()), id: \.element.id) { index, entry in
                            Button { onSelect(entry) } label: { PortRow(entry: entry) }
                                .buttonStyle(.plain)
                            if index < store.visibleEntries.count - 1 { Divider().padding(.leading, 100) }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct EmptyState<Actions: View>: View {
    let title: String
    let systemImage: String
    let description: String
    @ViewBuilder let actions: Actions

    var body: some View {
        VStack(spacing: 9) {
            Image(systemName: systemImage)
                .font(.system(size: 28))
                .foregroundStyle(.secondary)
            Text(title).font(.headline)
            Text(description)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 300)
            actions
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct PortRow: View {
    let entry: PortEntry

    var body: some View {
        HStack(spacing: 12) {
            Text(":\(entry.port)")
                .font(.system(.body, design: .monospaced, weight: .semibold))
                .foregroundStyle(.blue)
                .frame(width: 82, alignment: .leading)
            VStack(alignment: .leading, spacing: 5) {
                Text(entry.title).font(.body.weight(.semibold)).lineLimit(1)
                HStack(spacing: 10) {
                    Label(runtime, systemImage: "terminal")
                    if let uptime = entry.uptime { Label(uptime, systemImage: "clock") }
                    if let cpu = entry.cpuPercent { Label(String(format: "%.0f%%", cpu), systemImage: "cpu") }
                    if let memory = entry.memoryKB {
                        Label(ByteCountFormatter.string(fromByteCount: Int64(memory) * 1024, countStyle: .memory), systemImage: "memorychip")
                    }
                    if let status = entry.http?.status {
                        Label(String(status), systemImage: "bolt.fill")
                            .foregroundStyle(status < 400 ? .green : .orange)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    private var runtime: String {
        if entry.framework != "unknown" { return entry.framework }
        if entry.docker != nil { return "Docker" }
        return entry.command
    }
}
