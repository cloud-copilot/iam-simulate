/**
 * This class manages a set of context keys, allowing for both literal
 * and pattern-based (regex) matching. It provides functionality to check if
 * a given key is included based on the configured keys.
 */
export class StrictContextKeys {
  private keyLiterals: Set<string> = new Set()
  private keyPatterns: RegExp[] = []
  private initialized: boolean = false

  /**
   * Create an instance
   * Can accept literal keys or regex patterns.  A regex pattern is enclosed in slashes (/pattern/).
   *
   * @param includedKeys the list of context keys, which can be literals or regex patterns.
   */
  constructor(private includedKeys: string[]) {}

  /**
   * Lazy initialization of ignored keys into literals and patterns.
   */
  private initialize(): void {
    if (this.initialized) {
      return
    }

    for (const key of this.includedKeys) {
      if (key.startsWith('/') && key.endsWith('/')) {
        const pattern = key.slice(1, -1)
        this.keyPatterns.push(new RegExp(pattern, 'i'))
      } else {
        this.keyLiterals.add(key.toLowerCase())
      }
    }
    this.initialized = true
  }

  /**
   * Is a given key is included in the strict context keys literals and patterns
   *
   * @param key the context key to check
   * @returns true if the key is included, false otherwise
   */
  public has(key: string): boolean {
    this.initialize()

    const lowerKey = key.toLowerCase()
    if (this.keyLiterals.has(lowerKey)) {
      return true
    }

    for (const pattern of this.keyPatterns) {
      if (pattern.test(key)) {
        return true
      }
    }
    return false
  }
}
