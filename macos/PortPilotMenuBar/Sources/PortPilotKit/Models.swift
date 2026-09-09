import Foundation

public struct PortEntry: Codable, Hashable, Identifiable, Sendable {
    public let port: Int
    public let pid: Int
    public let command: String
    public let fullCommand: String?
    public let cwd: String?
    public let projectName: String?
    public let framework: String
    public let user: String?
    public let parentPid: Int?
    public let parentCommand: String?
    public let processChain: [String]
    public let cpuPercent: Double?
    public let memoryKB: Int?
    public let uptime: String?
    public let http: HTTPHealth?
    public let docker: DockerInfo?

    public var id: String { "\(pid):\(port)" }
    public var title: String { projectName ?? docker?.containerName ?? command }
    public var isDevelopmentService: Bool {
        let process = "\(command) \(fullCommand ?? "")".lowercased()
        return projectName != nil ||
            framework != "unknown" ||
            docker != nil ||
            ["node", "deno", "bun", "python", "ruby", "cargo", "go run"].contains(where: process.contains)
    }
    public var healthDescription: String {
        guard let http else { return "Not probed" }
        if let status = http.status { return "HTTP \(status) · \(http.responseTimeMs ?? 0)ms" }
        return http.error ?? "Not reachable"
    }
}

public struct HTTPHealth: Codable, Hashable, Sendable {
    public let reachable: Bool
    public let `protocol`: String
    public let url: String
    public let status: Int?
    public let title: String?
    public let responseTimeMs: Int?
    public let error: String?
}

public struct DockerInfo: Codable, Hashable, Sendable {
    public let containerId: String
    public let containerName: String
    public let image: String
    public let privatePort: Int?
}

public struct KillResponse: Codable, Sendable {
    public let killed: Bool
    public let port: Int
    public let reason: String?
    public let affectedPids: [Int]?
    public let forcedPids: [Int]?
}

public enum ServiceFilter: String, CaseIterable, Identifiable, Sendable {
    case development = "Development"
    case all = "All"

    public var id: String { rawValue }
}

public enum ServiceSort: String, CaseIterable, Identifiable, Sendable {
    case port = "Port"
    case name = "Name"
    case memory = "Memory"
    case uptime = "Uptime"

    public var id: String { rawValue }
}

public enum PortFilter {
    public static func apply(
        _ entries: [PortEntry],
        search: String,
        filter: ServiceFilter,
        showSystemPorts: Bool,
        sort: ServiceSort = .port
    ) -> [PortEntry] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return entries.filter { entry in
            if filter != .all && !showSystemPorts && (entry.port < 1024 || entry.user == "root") { return false }
            switch filter {
            case .all: break
            case .development where !entry.isDevelopmentService: return false
            default: break
            }
            guard !query.isEmpty else { return true }
            let searchable = [
                String(entry.port), entry.projectName, entry.command, entry.fullCommand,
                entry.cwd, entry.framework, entry.user, entry.http?.title,
                entry.docker?.containerName, entry.docker?.image
            ].compactMap { $0 }.joined(separator: " ").lowercased()
            return searchable.contains(query)
        }
        .sorted { left, right in
            switch sort {
            case .port: return left.port < right.port
            case .name: return left.title.localizedCaseInsensitiveCompare(right.title) == .orderedAscending
            case .memory: return (left.memoryKB ?? 0) > (right.memoryKB ?? 0)
            case .uptime: return uptimeSeconds(left.uptime) > uptimeSeconds(right.uptime)
            }
        }
    }

    private static func uptimeSeconds(_ uptime: String?) -> Int {
        guard var value = uptime else { return 0 }
        var days = 0
        if let dash = value.firstIndex(of: "-") {
            days = Int(value[..<dash]) ?? 0
            value = String(value[value.index(after: dash)...])
        }
        let fields = value.split(separator: ":").compactMap { Int($0) }
        if fields.count == 3 { return days * 86_400 + fields[0] * 3_600 + fields[1] * 60 + fields[2] }
        if fields.count == 2 { return days * 86_400 + fields[0] * 60 + fields[1] }
        return days * 86_400 + (fields.first ?? 0)
    }
}
