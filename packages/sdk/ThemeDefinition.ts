import { GlassPalette, ThemeType } from './types'

/**
 * Base class for authoring custom themes in IndoctrinatedEdit.
 * Third-party theme authors subclass this class and register it with the theme microservice.
 */
export abstract class ThemeDefinition {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly type: ThemeType
  abstract readonly colors: GlassPalette

  /** Optional author display name */
  readonly author?: string
  /** Optional theme description */
  readonly description?: string
}
