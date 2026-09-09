import AppKit
import Foundation
import ServiceManagement
import UserNotifications

public enum WorkspaceActions {
    @MainActor
    public static func copy(_ value: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(value, forType: .string)
    }

    @MainActor
    public static func reveal(_ path: String) {
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: path)
    }

    @MainActor
    public static func openProject(_ path: String) {
        let projectURL = URL(fileURLWithPath: path)
        let applications = [
            "/Applications/Cursor.app",
            "/Applications/Visual Studio Code.app"
        ]
        if let app = applications.first(where: FileManager.default.fileExists(atPath:)) {
            NSWorkspace.shared.open(
                [projectURL],
                withApplicationAt: URL(fileURLWithPath: app),
                configuration: NSWorkspace.OpenConfiguration()
            )
        } else {
            NSWorkspace.shared.open(projectURL)
        }
    }
}

public enum NotificationService {
    public static func requestAuthorization() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])) ?? false
    }

    public static func send(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }
}

public enum LoginItemService {
    public static var isEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    public static func setEnabled(_ enabled: Bool) throws {
        if enabled {
            try SMAppService.mainApp.register()
        } else {
            try SMAppService.mainApp.unregister()
        }
    }
}
