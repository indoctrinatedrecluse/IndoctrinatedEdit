import { SnippetDefinition } from '../extensionTypes'

export const flutterSnippets: SnippetDefinition[] = [
  // --- Modern Dart 3 Core ---
  {
    label: 'dart-sealed-class',
    detail: 'Dart 3: Sealed Class Hierarchy & Pattern Matching',
    documentation: 'Exhaustive domain model with sealed class hierarchy and switch expression',
    insertText: 'sealed class ${1:AppState} {\n  const ${1:AppState}();\n}\n\nfinal class ${1:AppState}Initial extends ${1:AppState} {}\nfinal class ${1:AppState}Loading extends ${1:AppState} {}\nfinal class ${1:AppState}Success extends ${1:AppState} {\n  final String payload;\n  const ${1:AppState}Success(this.payload);\n}\nfinal class ${1:AppState}Error extends ${1:AppState} {\n  final String message;\n  const ${1:AppState}Error(this.message);\n}\n\nString resolveStateMessage(${1:AppState} state) => switch (state) {\n  ${1:AppState}Initial() => "Initialized and awaiting task",\n  ${1:AppState}Loading() => "Loading liquid asset stream...",\n  ${1:AppState}Success(:final payload) => "Payload: $payload",\n  ${1:AppState}Error(:final message) => "Error encountered: $message",\n};\n$0',
  },
  {
    label: 'dart-record',
    detail: 'Dart 3: Typed Records & Destructuring',
    documentation: 'Strongly typed Dart 3 record with named and positional fields',
    insertText: '({String id, String name, int score}) getUserScore() {\n  return (id: "usr_101", name: "Indoctrinated Recluse", score: 999);\n}\n\nvoid consume() {\n  final (:id, :name, :score) = getUserScore();\n  print("User $name ($id) holds score $score");\n}\n$0',
  },

  // --- Flutter Widgets & Liquid Glass UI ---
  {
    label: 'flutter-stateless',
    detail: 'Flutter: StatelessWidget Widget Definition',
    documentation: 'Standard immutable Flutter StatelessWidget with BuildContext',
    insertText: 'import "package:flutter/material.dart";\n\nclass ${1:LiquidCard} extends StatelessWidget {\n  final String title;\n  final Widget child;\n\n  const ${1:LiquidCard}({\n    super.key,\n    required this.title,\n    required this.child,\n  });\n\n  @override\n  Widget build(BuildContext context) {\n    return Container(\n      padding: const EdgeInsets.all(16.0),\n      decoration: BoxDecoration(\n        color: Colors.white.withOpacity(0.06),\n        borderRadius: BorderRadius.circular(16.0),\n        border: Border.all(color: Colors.white.withOpacity(0.12)),\n      ),\n      child: Column(\n        crossAxisAlignment: CrossAxisAlignment.start,\n        children: [\n          Text(title, style: Theme.of(context).textTheme.titleMedium),\n          const SizedBox(height: 8.0),\n          child,\n        ],\n      ),\n    );\n  }\n}\n$0',
  },
  {
    label: 'flutter-glassmorphic',
    detail: 'Flutter: Liquid Glass Frosted Container (BackdropFilter)',
    documentation: 'Authentic frosted glassmorphism widget with ImageFilter.blur and specular gradient border',
    insertText: 'import "dart:ui";\nimport "package:flutter/material.dart";\n\nclass GlassmorphicContainer extends StatelessWidget {\n  final Widget child;\n  final double blur;\n  final double opacity;\n  final double borderRadius;\n\n  const GlassmorphicContainer({\n    super.key,\n    required this.child,\n    this.blur = 16.0,\n    this.opacity = 0.08,\n    this.borderRadius = 20.0,\n  });\n\n  @override\n  Widget build(BuildContext context) {\n    return ClipRRect(\n      borderRadius: BorderRadius.circular(borderRadius),\n      child: BackdropFilter(\n        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),\n        child: Container(\n          padding: const EdgeInsets.all(20.0),\n          decoration: BoxDecoration(\n            color: Colors.white.withOpacity(opacity),\n            borderRadius: BorderRadius.circular(borderRadius),\n            border: Border.all(\n              color: Colors.white.withOpacity(0.18),\n              width: 1.2,\n            ),\n          ),\n          child: child,\n        ),\n      ),\n    );\n  }\n}\n$0',
  },
  {
    label: 'flutter-riverpod-notifier',
    detail: 'Riverpod: Modern AsyncNotifier / Notifier Provider',
    documentation: 'Riverpod 2.0 Notifier for predictable and testable state management',
    insertText: 'import "package:flutter_riverpod/flutter_riverpod.dart";\n\nclass ${1:CounterNotifier} extends Notifier<int> {\n  @override\n  int build() => 0;\n\n  void increment() => state++;\n  void decrement() => state--;\n}\n\nfinal ${2:counterProvider} = NotifierProvider<${1:CounterNotifier}, int>(\n  ${1:CounterNotifier}.new,\n);\n$0',
  },
  {
    label: 'flutter-go-router',
    detail: 'GoRouter: Declarative Routing Configuration',
    documentation: 'Declarative routing with GoRouter, subroutes, and error builder',
    insertText: 'import "package:flutter/material.dart";\nimport "package:go_router/go_router.dart";\n\nfinal GoRouter appRouter = GoRouter(\n  initialLocation: "/",\n  routes: <RouteBase>[\n    GoRoute(\n      path: "/",\n      builder: (BuildContext context, GoRouterState state) {\n        return const Scaffold(body: Center(child: Text("Home Dashboard")));\n      },\n    ),\n    GoRoute(\n      path: "/details/:id",\n      builder: (BuildContext context, GoRouterState state) {\n        final id = state.pathParameters["id"] ?? "";\n        return Scaffold(body: Center(child: Text("Item details: \$id")));\n      },\n    ),\n  ],\n);\n$0',
  },
  {
    label: 'flutter-widget-test',
    detail: 'Flutter: WidgetTester Component Unit Test',
    documentation: 'Component unit test verifying widget render tree and interaction triggers',
    insertText: 'import "package:flutter/material.dart";\nimport "package:flutter_test/flutter_test.dart";\n\nvoid main() {\n  testWidgets("${1:LiquidCard displays title and responds to taps}", (WidgetTester tester) async {\n    await tester.pumpWidget(\n      const MaterialApp(\n        home: Scaffold(\n          body: Center(child: Text("IndoctrinatedEdit")), \n        ),\n      ),\n    );\n\n    expect(find.text("IndoctrinatedEdit"), findsOneWidget);\n  });\n}\n',
  },
  {
    label: 'pubspec-yaml',
    detail: 'Flutter: pubspec.yaml Package Configuration',
    documentation: 'Modern Flutter package manifest with dependencies, assets, and flutter_lints',
    insertText: 'name: ${1:indoctrinated_app}\ndescription: "A modern liquid glass Flutter application."\nversion: 1.0.0+1\n\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\n\ndependencies:\n  flutter:\n    sdk: flutter\n  flutter_riverpod: ^2.5.0\n  go_router: ^14.0.0\n\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n  flutter_lints: ^3.0.0\n\nflutter:\n  uses-material-design: true\n',
  },
]
