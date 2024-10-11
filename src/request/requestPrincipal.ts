export interface RequestPrincipal {
  value(): string;

  accountId(): string | undefined;

}

export class RequestPrincipalImpl implements RequestPrincipal {
  constructor(private readonly rawValue: string) {}

  accountId(): string | undefined {
    return this.value().split(":").at(4);
  }

  public value(): string {
    return this.rawValue;
  }
}