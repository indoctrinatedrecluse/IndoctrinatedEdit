import {
  LanguageDefinition,
  IStatusBarItem,
  IInlineCompletionProvider,
  IToolchainCheck,
} from './types'

export interface IExtensionHostRegistry {
  registerLanguage(definition: LanguageDefinition): void
  registerStatusBarItem(item: IStatusBarItem): void
  registerInlineCompletion(provider: IInlineCompletionProvider): void
  registerToolchainCheck(check: IToolchainCheck): void
  registerCommand(commandId: string, handler: (...args: unknown[]) => unknown | Promise<unknown>): void
}

export interface ExtensionContext {
  readonly extensionId: string
  readonly workspacePath?: string
  readonly registry: IExtensionHostRegistry
}

/**
 * Base class for all IndoctrinatedEdit extensions.
 * Authors implement onActivate and onDeactivate to contribute functionality.
 */
export abstract class ExtensionPlugin {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly version: string

  readonly author?: string
  readonly description?: string

  /**
   * Called when the extension is activated inside the isolated extension host microservice.
   */
  abstract onActivate(context: ExtensionContext): Promise<void> | void

  /**
   * Called when the extension is unloaded or deactivated.
   */
  onDeactivate?(): Promise<void> | void
}
