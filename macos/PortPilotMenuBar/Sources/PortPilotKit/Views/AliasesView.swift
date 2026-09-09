import SwiftUI

public struct AliasesView: View {
    @EnvironmentObject private var store: PortStore
    @State private var name = ""
    @State private var port = ""

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                TextField("Name", text: $name)
                TextField("Port", text: $port).frame(width: 90)
                Button("Save") {
                    guard let value = Int(port), (1...65535).contains(value) else { return }
                    Task {
                        await store.saveAlias(name: name, port: value)
                        name = ""
                        port = ""
                    }
                }
                .disabled(!validAlias)
            }

            if store.aliases.isEmpty {
                EmptyState(
                    title: "No aliases",
                    systemImage: "tag",
                    description: "Create one above to share it with the ports CLI."
                ) { EmptyView() }
            } else {
                List(store.aliases.keys.sorted(), id: \.self) { alias in
                    HStack {
                        Image(systemName: "tag")
                        Text(alias).fontWeight(.medium)
                        Spacer()
                        Text(":\(store.aliases[alias] ?? 0)").font(.system(.body, design: .monospaced)).foregroundStyle(.secondary)
                        Button { WorkspaceActions.copy(alias) } label: { Image(systemName: "doc.on.doc") }
                            .buttonStyle(.borderless).help("Copy alias")
                        Button(role: .destructive) { Task { await store.removeAlias(name: alias) } } label: { Image(systemName: "trash") }
                            .buttonStyle(.borderless).help("Remove alias")
                    }
                }
                .listStyle(.inset)
            }
            Spacer()
        }
        .padding(14)
    }

    private var validAlias: Bool {
        name.range(of: "^[A-Za-z][A-Za-z0-9._-]*$", options: .regularExpression) != nil &&
            Int(port).map { (1...65535).contains($0) } == true
    }
}
