// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PortPilotMenuBar",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "PortPilotMenuBar", targets: ["PortPilotMenuBar"])
    ],
    targets: [
        .target(name: "PortPilotKit"),
        .executableTarget(
            name: "PortPilotMenuBar",
            dependencies: ["PortPilotKit"]
        ),
        .testTarget(
            name: "PortPilotKitTests",
            dependencies: ["PortPilotKit"]
        )
    ],
    swiftLanguageModes: [.v5]
)
