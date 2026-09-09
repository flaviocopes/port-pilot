import AppKit
import Foundation

@MainActor
public final class PortStore: ObservableObject {
    @Published public private(set) var entries: [PortEntry] = []
    @Published public private(set) var aliases: [String: Int] = [:]
    @Published public private(set) var isRefreshing = false
    @Published public private(set) var lastUpdated: Date?
    @Published public var errorMessage: String?
    @Published public var search = ""
    @Published public var filter: ServiceFilter = .development
    @Published public var sort: ServiceSort = .port
    @Published public var cliPath: String {
        didSet { defaults.set(cliPath, forKey: Keys.cliPath) }
    }
    @Published public var refreshInterval: Double {
        didSet {
            defaults.set(refreshInterval, forKey: Keys.refreshInterval)
            restartRefreshLoop()
        }
    }
    @Published public var showSystemPorts: Bool {
        didSet { defaults.set(showSystemPorts, forKey: Keys.showSystemPorts) }
    }
    @Published public var lifecycleNotifications: Bool {
        didSet { defaults.set(lifecycleNotifications, forKey: Keys.lifecycleNotifications) }
    }

    private let defaults: UserDefaults
    private var refreshTask: Task<Void, Never>?
    private var hasInitialSnapshot = false

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let cachedSnapshot = defaults.data(forKey: Keys.cachedSnapshot)
            .flatMap { try? JSONDecoder().decode(CachedSnapshot.self, from: $0) }
        entries = cachedSnapshot?.entries ?? []
        aliases = cachedSnapshot?.aliases ?? [:]
        lastUpdated = cachedSnapshot?.updatedAt
        hasInitialSnapshot = cachedSnapshot != nil
        let savedPath = defaults.string(forKey: Keys.cliPath)
        cliPath = CLIExecutableLocator.locate(savedPath: savedPath) ?? savedPath ?? ""
        let savedInterval = defaults.double(forKey: Keys.refreshInterval)
        refreshInterval = savedInterval > 0 ? savedInterval : 3
        showSystemPorts = defaults.object(forKey: Keys.showSystemPorts) as? Bool ?? false
        lifecycleNotifications = defaults.bool(forKey: Keys.lifecycleNotifications)
        restartRefreshLoop()
    }

    deinit { refreshTask?.cancel() }

    public var visibleEntries: [PortEntry] {
        PortFilter.apply(entries, search: search, filter: filter, showSystemPorts: showSystemPorts, sort: sort)
    }

    public var healthyCount: Int {
        visibleEntries.filter { ($0.http?.status ?? 500) < 400 && $0.http?.reachable == true }.count
    }

    public var menuLabel: String {
        String(visibleEntries.count)
    }

    public func start() {
        guard refreshTask == nil else { return }
        restartRefreshLoop()
    }

    public func stop() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    public func refresh() async {
        guard !isRefreshing else { return }
        guard !cliPath.isEmpty else {
            errorMessage = PortPilotCLIError.executableNotFound.localizedDescription
            return
        }

        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let cli = PortPilotCLI(executablePath: cliPath)
            async let nextAliases = cli.aliases()
            let previous = entries
            entries = try await cli.list()
            persistSnapshot()
            aliases = try await nextAliases
            errorMessage = nil
            lastUpdated = Date()
            persistSnapshot()
            evaluateLifecycle(previous: previous, current: entries)
            hasInitialSnapshot = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func saveAlias(name: String, port: Int) async {
        await perform {
            try await self.client().saveAlias(name: name, port: port)
            self.aliases = try await self.client().aliases()
        }
    }

    public func removeAlias(name: String) async {
        await perform {
            try await self.client().removeAlias(name: name)
            self.aliases = try await self.client().aliases()
        }
    }

    public func stopService(_ entry: PortEntry) async -> Bool {
        do {
            _ = try await client().stop(port: entry.port)
            NotificationService.send(title: "Service stopped", body: "Freed port \(entry.port) · \(entry.title)")
            await refresh()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func openService(_ entry: PortEntry) async {
        do {
            if let urlString = entry.http?.url, let url = URL(string: urlString) {
                NSWorkspace.shared.open(url)
            } else {
                try await client().open(port: entry.port)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func enableLifecycleNotifications(_ enabled: Bool) async {
        if enabled {
            lifecycleNotifications = await NotificationService.requestAuthorization()
        } else {
            lifecycleNotifications = false
        }
    }

    public func chooseCLIExecutable() {
        let panel = NSOpenPanel()
        panel.title = "Choose the Port Pilot CLI executable"
        panel.prompt = "Choose ports"
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        if panel.runModal() == .OK, let path = panel.url?.path {
            cliPath = path
            restartRefreshLoop()
        }
    }

    public func autoLocateCLI() {
        if let located = CLIExecutableLocator.locate(savedPath: cliPath.isEmpty ? nil : cliPath) {
            cliPath = located
            errorMessage = nil
            restartRefreshLoop()
        } else {
            errorMessage = PortPilotCLIError.executableNotFound.localizedDescription
        }
    }

    private func client() throws -> PortPilotCLI {
        guard !cliPath.isEmpty else { throw PortPilotCLIError.executableNotFound }
        return PortPilotCLI(executablePath: cliPath)
    }

    private func perform(_ operation: @escaping () async throws -> Void) async {
        do {
            try await operation()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func restartRefreshLoop() {
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await self.refresh()
                let nanoseconds = UInt64(max(self.refreshInterval, 1) * 1_000_000_000)
                try? await Task.sleep(nanoseconds: nanoseconds)
            }
        }
    }

    private func evaluateLifecycle(previous: [PortEntry], current: [PortEntry]) {
        guard hasInitialSnapshot && lifecycleNotifications else { return }
        let old = Dictionary(uniqueKeysWithValues: previous.map { ($0.id, $0) })
        let new = Dictionary(uniqueKeysWithValues: current.map { ($0.id, $0) })

        for (id, entry) in new where old[id] == nil {
            NotificationService.send(title: "Service started", body: "Port \(entry.port) · \(entry.title)")
        }
        for (id, entry) in old where new[id] == nil {
            NotificationService.send(title: "Service stopped", body: "Port \(entry.port) · \(entry.title)")
        }
        for (id, entry) in new {
            guard let prior = old[id], prior.http?.status != entry.http?.status, let status = entry.http?.status else { continue }
            NotificationService.send(title: "Health changed", body: "Port \(entry.port) now returns HTTP \(status)")
        }
    }

    private func persistSnapshot() {
        let snapshot = CachedSnapshot(entries: entries, aliases: aliases, updatedAt: lastUpdated ?? Date())
        if let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: Keys.cachedSnapshot)
        }
    }

    private struct CachedSnapshot: Codable {
        let entries: [PortEntry]
        let aliases: [String: Int]
        let updatedAt: Date
    }

    private enum Keys {
        static let cliPath = "cliPath"
        static let refreshInterval = "refreshInterval"
        static let showSystemPorts = "showSystemPorts"
        static let lifecycleNotifications = "lifecycleNotifications"
        static let cachedSnapshot = "cachedSnapshot"
    }
}
