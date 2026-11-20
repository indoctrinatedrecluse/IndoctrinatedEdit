/**
 * Normalizes any Windows or POSIX file path into a safe, valid Monaco file URI
 * with preserved extension (e.g. .tsx, .py, .rs) so Monaco workers correctly detect grammar.
 */
export function toMonacoModelPath(filePath?: string): string {
  if (!filePath) return 'file:///welcome.ts'
  const stripped = filePath.replace(/^file:\/\//, '').replace(/\\/g, '/')
  const clean = stripped.startsWith('/') ? stripped : `/${stripped}`
  return `file://${clean}`
}

/**
 * Configures TypeScript/JavaScript compiler and diagnostic options across Monaco instances
 * prior to model mounting. Disables unresolvable browser-environment semantic errors (e.g.
 * missing 3rd party node_modules) while preserving genuine syntax errors.
 */
export function configureMonacoCompilerOptions(monacoInstance: any) {
  try {
    const tsLang = monacoInstance?.languages?.typescript as any
    if (tsLang?.typescriptDefaults?.setCompilerOptions) {
      tsLang.typescriptDefaults.setCompilerOptions({
        target: tsLang.ScriptTarget?.ESNext ?? 99,
        module: tsLang.ModuleKind?.ESNext ?? 99,
        moduleResolution: tsLang.ModuleResolutionKind?.NodeJs ?? 2,
        jsx: tsLang.JsxEmit?.ReactJSX ?? 4,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowNonTsExtensions: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        checkJs: false,
      })
      if (tsLang.typescriptDefaults.setDiagnosticsOptions) {
        tsLang.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true, // Prevent unresolved external imports from painting newly opened files with red squiggles
          noSyntaxValidation: false, // Keep genuine syntax errors active
          noSuggestionDiagnostics: true,
        })
      }
    }
    if (tsLang?.javascriptDefaults?.setCompilerOptions) {
      tsLang.javascriptDefaults.setCompilerOptions({
        target: tsLang.ScriptTarget?.ESNext ?? 99,
        module: tsLang.ModuleKind?.ESNext ?? 99,
        moduleResolution: tsLang.ModuleResolutionKind?.NodeJs ?? 2,
        jsx: tsLang.JsxEmit?.ReactJSX ?? 4,
        allowNonTsExtensions: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        checkJs: false,
      })
      if (tsLang.javascriptDefaults.setDiagnosticsOptions) {
        tsLang.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
          noSuggestionDiagnostics: true,
        })
      }
    }
    if (monacoInstance?.languages?.json?.jsonDefaults?.setDiagnosticsOptions) {
      monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
      })
    }
  } catch {
    // Ignore in mocked/headless Monaco environments
  }
}
