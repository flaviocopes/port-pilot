import Foundation

public enum PortPilotCLIError: LocalizedError {
    case executableNotFound
    case commandFailed(String)
    case invalidOutput(String)

    public var errorDescription: String? {
        switch self {
        case .executableNotFound:
            return "Port Pilot CLI not found. Choose the ports executable in Settings."
        case .commandFailed(let message):
            return message
        case .invalidOutput(let message):
            return "Port Pilot returned invalid JSON: \(message)"
        }
    }
}

public enum CLIExecutableLocator {
    public static func locate(savedPath: String? = nil, currentDirectory: String = FileManager.default.currentDirectoryPath) -> String? {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let candidates = [
            savedPath,
            Bundle.main.path(forResource: "ports", ofType: nil),
            "/opt/homebrew/bin/ports",
            "/usr/local/bin/ports",
            "\(home)/.npm-global/bin/ports",
            "\(home)/.local/bin/ports",
            "\(currentDirectory)/dist/index.js",
            "\(currentDirectory)/../../dist/index.js",
            "\(currentDirectory)/../../../dist/index.js"
        ].compactMap { $0 }

        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }
}

public struct PortPilotCLI: Sendable {
    public let executablePath: String

    public init(executablePath: String) {
        self.executablePath = executablePath
    }

    public func list() async throws -> [PortEntry] {
        try await decode([PortEntry].self, arguments: ["list", "--all", "--json"])
    }

    public func aliases() async throws -> [String: Int] {
        try await decode([String: Int].self, arguments: ["alias", "--json"])
    }

    public func saveAlias(name: String, port: Int) async throws {
        _ = try await run(["alias", name, String(port), "--json"])
    }

    public func removeAlias(name: String) async throws {
        _ = try await run(["alias", "--remove", name, "--json"])
    }

    public func stop(port: Int) async throws -> KillResponse {
        try await decode(KillResponse.self, arguments: ["kill", String(port), "--yes", "--json"])
    }

    public func open(port: Int) async throws {
        _ = try await run(["open", String(port)])
    }

    private func decode<T: Decodable>(_ type: T.Type, arguments: [String]) async throws -> T {
        let data = try await run(arguments)
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            throw PortPilotCLIError.invalidOutput(error.localizedDescription)
        }
    }

    private func run(_ arguments: [String]) async throws -> Data {
        let path = executablePath
        return try await Task.detached(priority: .userInitiated) {
            guard FileManager.default.isExecutableFile(atPath: path) else {
                throw PortPilotCLIError.executableNotFound
            }

            let process = Process()
            let output = Pipe()
            let errors = Pipe()
            process.executableURL = URL(fileURLWithPath: path)
            process.arguments = arguments
            process.standardOutput = output
            process.standardError = errors

            var environment = ProcessInfo.processInfo.environment
            let usefulPaths = ["/opt/homebrew/bin", "/usr/local/bin", "\(FileManager.default.homeDirectoryForCurrentUser.path)/.local/bin"]
            environment["PATH"] = (usefulPaths + [environment["PATH"] ?? "/usr/bin:/bin"]).joined(separator: ":")
            process.environment = environment

            do {
                try process.run()
            } catch {
                throw PortPilotCLIError.commandFailed(error.localizedDescription)
            }
            process.waitUntilExit()
            let data = output.fileHandleForReading.readDataToEndOfFile()
            let errorData = errors.fileHandleForReading.readDataToEndOfFile()
            guard process.terminationStatus == 0 else {
                let message = String(data: errorData, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                throw PortPilotCLIError.commandFailed(message?.replacingOccurrences(of: "Error: ", with: "") ?? "Port Pilot command failed")
            }
            return data
        }.value
    }
}
