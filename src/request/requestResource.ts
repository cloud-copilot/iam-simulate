export interface RequestResource {
  /**
   * The raw string of the resource
   */
  value(): string

  /**
   * The partition of the ARN
   */
  partition(): string

  /**
   * The service of the ARN
   */
  service(): string

  /**
   * The region of the ARN
   */
  region(): string

  /**
   * The account of the ARN
   */
  account(): string

  /**
   * The resource of the ARN
   */
  resource(): string

  /**
   * The account ID of the resource, independent of what is in the ARN
   */
  accountId(): string
}

export class ResourceRequestImpl implements RequestResource {
  constructor(
    private readonly rawValue: string,
    private readonly accountIdString: string
  ) {}

  partition(): string {
    return this.value().split(':').at(1)!
  }

  service(): string {
    return this.value().split(':').at(2)!
  }

  region(): string {
    return this.value().split(':').at(3)!
  }

  account(): string {
    return this.value().split(':').at(4)!
  }

  resource(): string {
    return this.value().split(':').slice(5).join(':')
  }

  value(): string {
    return this.rawValue
  }

  accountId(): string {
    return this.accountIdString
  }
}
