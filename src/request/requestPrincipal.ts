
/**
 * A principal in a request
 */
export interface RequestPrincipal {

  /**
   * The raw string of the principal
   */
  value(): string;

  /**
   * The account id of the principal, if the principal is an ARN that has an account ID, otherwise undefined
   */
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

  //TODO: A principal is a Service Linked Role if it is an ARN and has the path arn:aws:iam::111111111111:role/aws-service-role/...
}