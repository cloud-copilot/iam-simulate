/**
 * A service action: `"service:Action"`
 */
export interface RequestAction {
  /**
   * The raw string value of the action
   */
  value(): string

  /**
   * The service of the action
   *
   * Guaranteed to be lowercase
   */
  service(): string

  /**
   * The action within the service
   */
  action(): string
}

export class RequestActionImpl implements RequestAction {
  constructor(private readonly rawValue: string) {}

  public value(): string {
    return this.rawValue
  }

  public service(): string {
    return this.rawValue.split(':')[0]!.toLowerCase()
  }

  public action(): string {
    return this.rawValue.split(':')[1]
  }
}
