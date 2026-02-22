import { type ResourceAnalysis } from '../evaluate.js'
import { type RequestResource } from '../request/requestResource.js'
import { DefaultServiceAuthorizer } from './DefaultServiceAuthorizer.js'

/**
 * The default authorizer for services.
 */
export class KmsServiceAuthorizer extends DefaultServiceAuthorizer {
  /**
   * Determines if the service trusts the principal's Account's IAM policies
   *
   * @param sameAccount - If the principal and resource are in the same account
   * @param resourceAnalysis - The resource policy analysis
   * @returns true if the service trusts the principal's account IAM policies
   */
  override serviceTrustsPrincipalAccount(
    sameAccount: boolean,
    resourceAnalysis: ResourceAnalysis,
    resource: RequestResource
  ): boolean {
    if (sameAccount && resource.value() == '*') {
      return true
    }
    return resourceAnalysis.allowStatements.some(
      (statement) => statement.principalMatch === 'AccountLevelMatch'
    )
  }
}
