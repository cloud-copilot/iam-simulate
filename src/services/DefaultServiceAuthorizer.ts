import { isAssumedRoleArn, isFederatedUserArn, isIamUserArn } from '@cloud-copilot/iam-utils'
import { RequestAnalysis, ResourceAnalysis } from '../evaluate.js'
import { RequestResource } from '../request/requestResource.js'
import { ServiceAuthorizationRequest, ServiceAuthorizer } from './ServiceAuthorizer.js'

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const scpResult = request.scpAnalysis.result
    const rcpResult = request.rcpAnalysis.result
    const identityStatementResult = request.identityAnalysis.result
    const resourcePolicyResult = request.resourceAnalysis?.result
    const permissionBoundaryResult = request.permissionBoundaryAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    const baseResult: Pick<
      RequestAnalysis,
      | 'sameAccount'
      | 'scpAnalysis'
      | 'rcpAnalysis'
      | 'resourceAnalysis'
      | 'identityAnalysis'
      | 'permissionBoundaryAnalysis'
    > = {
      sameAccount,
      identityAnalysis: request.identityAnalysis,
      scpAnalysis: request.scpAnalysis,
      rcpAnalysis: request.rcpAnalysis,
      resourceAnalysis: request.resourceAnalysis,
      permissionBoundaryAnalysis: request.permissionBoundaryAnalysis
    }

    if (scpResult !== 'Allowed') {
      return {
        result: scpResult,
        ...baseResult
      }
    }

    if (rcpResult !== 'Allowed') {
      return {
        result: rcpResult,
        ...baseResult
      }
    }

    if (
      resourcePolicyResult === 'ExplicitlyDenied' ||
      resourcePolicyResult === 'DeniedForAccount'
    ) {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    if (identityStatementResult === 'ExplicitlyDenied') {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    if (permissionBoundaryResult === 'ExplicitlyDenied') {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    //Same Account
    if (principalAccount === resourceAccount) {
      if (permissionBoundaryResult === 'ImplicitlyDenied') {
        /**
         * If the permission boundary is an implicit deny
         *
         * If the request is from an assumed role ARN AND the resource policy allows the assumed role (session) ARN = ALLOW
         * If the request is from an IAM user ARN AND the resource policy allows the IAM user ARN = ALLOW
         * If the request is from a federated user ARN AND the resource policy allows the federated user ARN = ALLOW
         * The request is allowed: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
         */
        if (resourcePolicyResult === 'Allowed') {
          const principal = request.request.principal.value()
          if (
            isAssumedRoleArn(principal) ||
            isIamUserArn(principal) ||
            isFederatedUserArn(principal)
          ) {
            if (
              request.resourceAnalysis.allowStatements.some(
                (statement) => statement.principalMatch === 'Match'
              )
            ) {
              return {
                result: 'Allowed',
                ...baseResult
              }
            }
          }
        }
        return {
          result: 'ImplicitlyDenied',
          ...baseResult
        }
      }

      /*
        TODO: Implicit denies in identity policies
        I think if the identity policy has an implicit deny for assumed roles or federated users,
        then the resource policy must have the federerated or assumed role ARN exactly.

        That doesn't seem right though. I know many cases where the resource policy has the role ARN and it works

        Need to add some tests for this.
      */

      const trustedAccount = this.serviceTrustsPrincipalAccount(
        sameAccount,
        request.resourceAnalysis,
        request.request.resource
      )
      if (
        resourcePolicyResult === 'Allowed' ||
        (trustedAccount && identityStatementResult === 'Allowed')
      ) {
        return {
          result: 'Allowed',
          ...baseResult
        }
      }
      return {
        result: 'ImplicitlyDenied',
        ...baseResult
      }
    }

    //Cross Account
    if (permissionBoundaryResult === 'ImplicitlyDenied') {
      return {
        result: 'ImplicitlyDenied',
        ...baseResult
      }
    }

    if (resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount') {
      if (identityStatementResult === 'Allowed') {
        return {
          result: 'Allowed',
          ...baseResult
        }
      }
      return {
        result: 'ImplicitlyDenied',
        ...baseResult
      }
    }

    return {
      result: 'ImplicitlyDenied',
      ...baseResult
    }

    /**
     * Add checks for:
     * * root user - can override resource policies for most resource types
     * * service linked roles - ignore SCPs and RCPs
     * * session policies
     * * vpc endpoint policies
     * * organization APIs and delegated admin policy
     */
  }

  /**
   * Determines if the service trusts the principal's Account's IAM policies
   *
   * @param sameAccount - If the principal and resource are in the same account
   * @param resourceAnalysis - The resource policy analysis
   * @returns true if the service trusts the principal's account IAM policies
   */
  serviceTrustsPrincipalAccount(
    sameAccount: boolean,
    resourceAnalysis: ResourceAnalysis,
    resource: RequestResource
  ): boolean {
    if (sameAccount) {
      return true
    }

    return resourceAnalysis.allowStatements.some(
      (statement) => statement.principalMatch === 'AccountLevelMatch'
    )
  }
}
