import { type RequestAnalysis, type ResourceAnalysis } from '../evaluate.js'
import { type RequestResource } from '../request/requestResource.js'
import { DefaultServiceAuthorizer } from './DefaultServiceAuthorizer.js'
import { type ServiceAuthorizationRequest } from './ServiceAuthorizer.js'

/**
 * The default authorizer for services.
 */
export class StsServiceAuthorizer extends DefaultServiceAuthorizer {
  public override authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    if (request.request.action.value().toLowerCase() === 'sts:getcalleridentity') {
      return {
        result: 'Allowed',
        sameAccount: true
      }
    }
    return super.authorize(request)
  }

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
    //If there is no resource policy, the service trusts the principal's account IAM policies
    if (sameAccount && resourceAnalysis.result === 'NotApplicable') {
      return true
    }

    /*
      If there is a resource policy, for instance a role trust policy,
      the trust policy must explicitly allow the principal's account,
      even if the principal and resource are in the same account.
    */
    return resourceAnalysis.allowStatements.some(
      (statement) => statement.principalMatch === 'AccountLevelMatch'
    )
  }
}
