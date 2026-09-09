import PortPilotKit
import SwiftUI

@main
struct PortPilotMenuBarApp: App {
    @StateObject private var store = PortStore()

    var body: some Scene {
        MenuBarExtra {
            MainPanel()
                .environmentObject(store)
        } label: {
            Label(store.menuLabel, systemImage: "point.3.connected.trianglepath.dotted")
        }
        .menuBarExtraStyle(.window)
    }
}
