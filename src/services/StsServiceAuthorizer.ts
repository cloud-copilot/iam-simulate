import { ResourceAnalysis } from '../evaluate.js'
import { DefaultServiceAuthorizer } from './DefaultServiceAuthorizer.js'

/**
 * The default authorizer for services.
 */
export class StsServiceAuthorizer extends DefaultServiceAuthorizer {
  /**
   * Determines if the service trusts the principal's Account's IAM policies
   *
   * @param sameAccount - If the principal and resource are in the same account
   * @param resourceAnalysis - The resource policy analysis
   * @returns true if the service trusts the principal's account IAM policies
   */
  serviceTrustsPrincipalAccount(sameAccount: boolean, resourceAnalysis: ResourceAnalysis): boolean {
    if (sameAccount && resourceAnalysis.result === 'NotApplicable') {
      return true
    }
    return resourceAnalysis.allowStatements.some(
      (statement) => statement.principalMatch === 'AccountLevelMatch'
    )
  }
}
