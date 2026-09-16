import { SnippetDefinition } from '../extensionTypes'

// 1. Swift & SwiftUI Snippets
export const SWIFT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'swift-swiftui-view',
    detail: 'SwiftUI: View Struct with State & Liquid Glass Styling',
    documentation: 'SwiftUI 6 component with @State, @Binding, and glassmorphic material styling',
    insertText: 'import SwiftUI\n\nstruct ${1:GlassCardView}: View {\n    @State private var isExpanded: Bool = false\n    var title: String = "Liquid Glass View"\n\n    var body: some View {\n        VStack(alignment: .leading, spacing: 12) {\n            Text(title)\n                .font(.headline)\n                .foregroundColor(.white)\n            \n            if isExpanded {\n                Text("Expanded specular contents")\n                    .font(.subheadline)\n                    .foregroundColor(.secondary)\n                    .transition(.opacity.combined(with: .scale))\n            }\n            \n            Button(action: { withAnimation(.spring()) { isExpanded.toggle() } }) {\n                Text(isExpanded ? "Collapse" : "Expand")\n                    .font(.footnote.weight(.semibold))\n                    .padding(.horizontal, 14)\n                    .padding(.vertical, 8)\n                    .background(.ultraThinMaterial, in: Capsule())\n            }\n        }\n        .padding(18)\n        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))\n        .overlay(\n            RoundedRectangle(cornerRadius: 16)\n                .stroke(LinearGradient(colors: [.white.opacity(0.3), .clear], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1)\n        )\n    }\n}\n\n#Preview {\n    ${1:GlassCardView}()\n        .preferredColorScheme(.dark)\n}\n$0',
  },
  {
    label: 'swift-async-actor',
    detail: 'Swift: Actor for Isolated Concurrent State Management',
    documentation: 'Swift Actor ensuring data-race safety across asynchronous Task contexts',
    insertText: 'import Foundation\n\nactor ${1:TelemetryStore} {\n    private var cache: [String: Data] = [:]\n    private var requestCount: Int = 0\n\n    func record(key: String, payload: Data) {\n        cache[key] = payload\n        requestCount += 1\n    }\n\n    func fetch(key: String) -> Data? {\n        return cache[key]\n    }\n\n    func stats() -> (items: Int, totalRequests: Int) {\n        return (cache.count, requestCount)\n    }\n}\n$0',
  },
  {
    label: 'swift-swiftdata-model',
    detail: 'SwiftData: @Model Persistent Schema',
    documentation: 'SwiftData schema definition with relationships and attribute constraints',
    insertText: 'import Foundation\nimport SwiftData\n\n@Model\nfinal class ${1:ProjectAsset} {\n    @Attribute(.unique) var id: UUID\n    var name: String\n    var createdAt: Date\n    var isFavorite: Bool\n    \n    @Relationship(deleteRule: .cascade) var tags: [String] = []\n\n    init(name: String, isFavorite: Bool = false) {\n        self.id = UUID()\n        self.name = name\n        self.createdAt = Date()\n        self.isFavorite = isFavorite\n    }\n}\n$0',
  },
  {
    label: 'swift-vapor-route',
    detail: 'Vapor 4 (Server Swift): RouteCollection Controller',
    documentation: 'Server-side Swift Vapor REST controller with async/await handlers',
    insertText: 'import Vapor\nimport Fluent\n\nstruct ${1:AssetController}: RouteCollection {\n    func boot(routes: RoutesBuilder) throws {\n        let assets = routes.grouped("api", "v1", "assets")\n        assets.get(use: index)\n        assets.post(use: create)\n    }\n\n    @Sendable\n    func index(req: Request) async throws -> [String: String] {\n        return ["status": "healthy", "runtime": "Vapor 4 Server-Side Swift"]\n    }\n\n    @Sendable\n    func create(req: Request) async throws -> HTTPStatus {\n        return .created\n    }\n}\n$0',
  },
  {
    label: 'swift-concurrency-task',
    detail: 'Swift: Structured Concurrency TaskGroup with Async Let',
    documentation: 'Parallel task orchestration with TaskGroup and cancellation handling',
    insertText: 'import Foundation\n\nfunc fetchAllTelemetry(endpoints: [URL]) async throws -> [String] {\n    try await withThrowingTaskGroup(of: String.self) { group in\n        for url in endpoints {\n            group.addTask {\n                let (data, _) = try await URLSession.shared.data(from: url)\n                return String(decoding: data, as: UTF8.self)\n            }\n        }\n        var results: [String] = []\n        for try await result in group {\n            results.append(result)\n        }\n        return results\n    }\n}\n$0',
  },
  {
    label: 'swift-protocol-extension',
    detail: 'Swift: Protocol with Default Implementation and Generics',
    documentation: 'Protocol definition with associated type and extension methods',
    insertText: 'protocol ${1:RenderableNode} {\n    associatedtype Context\n    var id: UUID { get }\n    func render(in context: Context)\n}\n\nextension ${1:RenderableNode} {\n    func logRender() {\n        print("Rendering node: \\(id)")\n    }\n}\n$0',
  },
  {
    label: 'swift-guard-let',
    detail: 'Swift: Guard Let Early Exit Pattern',
    documentation: 'Safe unwrapping with early guard statement return or throw',
    insertText: 'guard let ${1:value} = ${2:optionalValue} else {\n    throw NSError(domain: "${3:com.indoctrinated.editor}", code: -1, userInfo: [NSLocalizedDescriptionKey: "${4:Value was nil}"])\n}\n$0',
  },
  {
    label: 'swift-result-type',
    detail: 'Swift: Result Enum Transformation & Error Handling',
    documentation: 'Idiomatic Result<Success, Failure> handling with pattern matching',
    insertText: 'func handleOperationResult(_ result: Result<${1:Data}, Error>) {\n    switch result {\n    case .success(let payload):\n        print("Success with \\(payload.count) bytes")\n    case .failure(let error):\n        print("Operation failed: \\(error.localizedDescription)")\n    }\n}\n$0',
  },
  {
    label: 'swift-macro-attached',
    detail: 'Swift 6: Attached Macro Definition & Implementation',
    documentation: 'Swift macro definition using SwiftSyntax for compile-time code generation',
    insertText: 'import SwiftCompilerPlugin\nimport SwiftSyntax\nimport SwiftSyntaxBuilder\nimport SwiftSyntaxMacros\n\npublic struct ${1:LiquidGlassMacro}: MemberMacro {\n    public static func expansion(\n        of node: AttributeSyntax,\n        providingMembersOf declaration: some DeclGroupSyntax,\n        in context: some MacroExpansionContext\n    ) throws -> [DeclSyntax] {\n        return [\n            "public var sheenIntensity: Double = 0.85"\n        ]\n    }\n}\n$0',
  },
  {
    label: 'swift-enum-associated',
    detail: 'Swift: Enum with Associated Values & Pattern Matching',
    documentation: 'Type-safe state enum with associated value extraction',
    insertText: 'enum ${1:EditorState} {\n    case idle\n    case loading(progress: Double)\n    case active(documentId: String, content: String)\n    case failed(reason: String)\n}\n$0',
  },
]

// 2. Objective-C Snippets
export const OBJC_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'objc-interface',
    detail: 'Objective-C: @interface Header Declaration',
    documentation: 'Objective-C class interface with properties and method declarations',
    insertText: '#import <Foundation/Foundation.h>\n\nNS_ASSUME_NONNULL_BEGIN\n\n@interface ${1:IDEPluginManager} : NSObject\n\n@property (nonatomic, copy, readonly) NSString *pluginIdentifier;\n@property (nonatomic, assign, getter=isEnabled) BOOL enabled;\n\n- (instancetype)initWithIdentifier:(NSString *)identifier NS_DESIGNATED_INITIALIZER;\n- (void)executeCommand:(NSString *)command withParameters:(nullable NSDictionary *)params completion:(void (^)(BOOL success, NSError * _Nullable error))completion;\n\n@end\n\nNS_ASSUME_NONNULL_END\n$0',
  },
  {
    label: 'objc-implementation',
    detail: 'Objective-C: @implementation Class Body',
    documentation: 'Objective-C class implementation with init and method definitions',
    insertText: '#import "${1:IDEPluginManager}.h"\n\n@implementation ${1:IDEPluginManager}\n\n- (instancetype)initWithIdentifier:(NSString *)identifier {\n    self = [super init];\n    if (self) {\n        _pluginIdentifier = [identifier copy];\n        _enabled = YES;\n    }\n    return self;\n}\n\n- (void)executeCommand:(NSString *)command withParameters:(nullable NSDictionary *)params completion:(void (^)(BOOL, NSError * _Nullable))completion {\n    NSLog(@"[IndoctrinatedEdit] Executing command: %@", command);\n    if (completion) {\n        completion(YES, nil);\n    }\n}\n\n@end\n$0',
  },
  {
    label: 'objc-singleton',
    detail: 'Objective-C: Thread-Safe Singleton with dispatch_once',
    documentation: 'Grand Central Dispatch dispatch_once thread-safe shared instance',
    insertText: '+ (instancetype)sharedInstance {\n    static ${1:IDEPluginManager} *shared = nil;\n    static dispatch_once_t onceToken;\n    dispatch_once(&onceToken, ^{\n        shared = [[self alloc] init];\n    });\n    return shared;\n}\n$0',
  },
  {
    label: 'objc-category',
    detail: 'Objective-C: Category Extension on Existing Class',
    documentation: 'Objective-C category definition providing helper methods to NSString/NSView',
    insertText: '@interface NSString (${1:LiquidGlassUtilities})\n- (NSString *)glassSanitizedIdentifier;\n@end\n\n@implementation NSString (${1:LiquidGlassUtilities})\n- (NSString *)glassSanitizedIdentifier {\n    return [self stringByReplacingOccurrencesOfString:@" " withString:@"_"];\n}\n@end\n$0',
  },
  {
    label: 'objc-block-typedef',
    detail: 'Objective-C: Block Callback Typedef Declaration',
    documentation: 'Objective-C block signature definition for completion handlers',
    insertText: 'typedef void (^${1:CompletionHandler})(BOOL success, id _Nullable result, NSError * _Nullable error);\n$0',
  },
]

export const SWIFT_APPLE_SNIPPETS: SnippetDefinition[] = [
  ...SWIFT_SNIPPETS,
  ...OBJC_SNIPPETS,
]

export const swiftSnippets = SWIFT_APPLE_SNIPPETS
