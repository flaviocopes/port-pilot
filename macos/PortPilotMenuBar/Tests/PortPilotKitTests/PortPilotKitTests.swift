import Foundation
import Testing
@testable import PortPilotKit

@Test func decodesCLIEntry() throws {
    let json = #"{"port":4321,"pid":123,"command":"node","fullCommand":"node server.js","cwd":"/tmp/demo","projectName":"demo","framework":"astro","user":"dev","parentPid":1,"parentCommand":"launchd","processChain":["launchd","node"],"cpuPercent":1.5,"memoryKB":2048,"uptime":"00:10","http":{"reachable":true,"protocol":"http","url":"http://localhost:4321","status":200,"title":"Demo","responseTimeMs":12,"error":null},"docker":null}"#.data(using: .utf8)!
    let entry = try JSONDecoder().decode(PortEntry.self, from: json)

    #expect(entry.id == "123:4321")
    #expect(entry.title == "demo")
    #expect(entry.http?.status == 200)
}

@Test func filtersDevelopmentSearchAndSystemPorts() throws {
    let entries = try JSONDecoder().decode([PortEntry].self, from: #"""
    [
      {"port":80,"pid":1,"command":"system","fullCommand":null,"cwd":null,"projectName":null,"framework":"unknown","user":"root","parentPid":null,"parentCommand":null,"processChain":[],"cpuPercent":null,"memoryKB":null,"uptime":null,"http":null,"docker":null},
      {"port":4321,"pid":2,"command":"node","fullCommand":"astro dev","cwd":"/tmp/docs","projectName":"docs","framework":"astro","user":"dev","parentPid":1,"parentCommand":"shell","processChain":["shell","node"],"cpuPercent":1,"memoryKB":100,"uptime":"1m","http":null,"docker":null},
      {"port":5432,"pid":3,"command":"docker","fullCommand":null,"cwd":null,"projectName":null,"framework":"unknown","user":"dev","parentPid":1,"parentCommand":"docker","processChain":["docker"],"cpuPercent":null,"memoryKB":null,"uptime":null,"http":null,"docker":{"containerId":"abc","containerName":"postgres","image":"postgres:17","privatePort":5432}},
      {"port":5000,"pid":4,"command":"ControlCe","fullCommand":null,"cwd":"/","projectName":null,"framework":"unknown","user":null,"parentPid":null,"parentCommand":null,"processChain":[],"cpuPercent":null,"memoryKB":null,"uptime":null,"http":null,"docker":null}
    ]
    """#.data(using: .utf8)!)

    #expect(PortFilter.apply(entries, search: "", filter: .all, showSystemPorts: false).map(\.port) == [80, 4321, 5000, 5432])
    #expect(PortFilter.apply(entries, search: "", filter: .development, showSystemPorts: true).map(\.port) == [4321, 5432])
    #expect(PortFilter.apply(entries, search: "postgres", filter: .all, showSystemPorts: true).map(\.port) == [5432])
    #expect(PortFilter.apply(entries, search: "", filter: .all, showSystemPorts: false, sort: .name).map(\.port) == [5000, 4321, 5432, 80])
    #expect(PortFilter.apply(entries, search: "", filter: .all, showSystemPorts: false, sort: .memory).first?.port == 4321)
    #expect(ServiceFilter.allCases == [.development, .all])
}

@Test func locatesAnExplicitExecutable() throws {
    let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try Data("#!/bin/sh\n".utf8).write(to: temporary)
    try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: temporary.path)
    defer { try? FileManager.default.removeItem(at: temporary) }

    #expect(CLIExecutableLocator.locate(savedPath: temporary.path) == temporary.path)
}

@MainActor
@Test func restoresCachedPortsBeforeTheFirstRefreshCompletes() throws {
    let suiteName = "PortPilotKitTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let entries = try JSONDecoder().decode([PortEntry].self, from: #"""
    [{"port":4321,"pid":2,"command":"node","fullCommand":"astro dev","cwd":"/tmp/docs","projectName":"docs","framework":"astro","user":"dev","parentPid":1,"parentCommand":"shell","processChain":["shell","node"],"cpuPercent":1,"memoryKB":100,"uptime":"1m","http":null,"docker":null}]
    """#.data(using: .utf8)!)
    let snapshot = CachedSnapshotFixture(entries: entries, aliases: ["docs": 4321], updatedAt: Date())
    defaults.set(try JSONEncoder().encode(snapshot), forKey: "cachedSnapshot")
    defaults.set("/missing/ports", forKey: "cliPath")

    let store = PortStore(defaults: defaults)
    #expect(store.entries.map(\.port) == [4321])
    #expect(store.aliases == ["docs": 4321])
    store.stop()
}

@Test func invokesAndDecodesTheCLIContract() async throws {
    let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    let script = """
    #!/bin/sh
    case "$1" in
      list) [ "$2" = "--all" ] || exit 2; printf '%s' '[]' ;;
      alias) printf '%s' '{"api":8787}' ;;
      *) exit 1 ;;
    esac
    """
    try Data(script.utf8).write(to: temporary)
    try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: temporary.path)
    defer { try? FileManager.default.removeItem(at: temporary) }

    let client = PortPilotCLI(executablePath: temporary.path)
    #expect(try await client.list().isEmpty)
    #expect(try await client.aliases()["api"] == 8787)
}

private struct CachedSnapshotFixture: Codable {
    let entries: [PortEntry]
    let aliases: [String: Int]
    let updatedAt: Date
}
