import { RequestAnalysis } from "../evaluate.js";
import { isAssumedRoleArn, isFederatedUserArn, isIamUserArn } from "../util.js";
import { ServiceAuthorizationRequest, ServiceAuthorizer } from "./ServiceAuthorizer.js";

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const scpResult = request.scpAnalysis.result;
    const identityStatementResult = request.identityAnalysis.result;
    const resourcePolicyResult = request.resourceAnalysis?.result
    const permissionBoundaryResult = request.permissionBoundaryAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    const baseResult: Pick<RequestAnalysis, 'sameAccount' | 'scpAnalysis' | 'resourceAnalysis' | 'identityAnalysis' | 'permissionBoundaryAnalysis' > = {
      sameAccount,
      identityAnalysis: request.identityAnalysis,
      scpAnalysis: request.scpAnalysis,
      resourceAnalysis: request.resourceAnalysis,
      permissionBoundaryAnalysis: request.permissionBoundaryAnalysis
    }

    if(scpResult !== 'Allowed') {
      return {
        result: scpResult,
        ...baseResult
      }
    }

    if(resourcePolicyResult === 'ExplicitlyDenied' || resourcePolicyResult === 'DeniedForAccount') {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    if(identityStatementResult === 'ExplicitlyDenied') {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    if(permissionBoundaryResult === 'ExplicitlyDenied') {
      return {
        result: 'ExplicitlyDenied',
        ...baseResult
      }
    }

    //Same Account
    if(principalAccount === resourceAccount) {

      if(permissionBoundaryResult === 'ImplicitlyDenied') {
        /**
         * If the permission boundary is an implicit deny
         *
         * If the request is from an assumed role ARN AND the resource policy allows the assumed role (session) ARN = ALLOW
         * If the request is from an IAM user ARN AND the resource policy allows the IAM user ARN = ALLOW
         * If the request is from a federated user ARN AND the resource policy allows the federated user ARN = ALLOW
         * The request is allowed: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
         */
        if(resourcePolicyResult === 'Allowed') {
          const principal = request.request.principal.value()
          if(isAssumedRoleArn(principal) || isIamUserArn(principal) || isFederatedUserArn(principal)) {
            if(request.resourceAnalysis.allowStatements.some(statement => statement.principalMatch === 'Match')){
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

        That doesn't seem right though. I know many cases where the resource policy has the role ARN

        Need to add some tests for this.
      */
      if(resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount' || identityStatementResult === 'Allowed') {
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
    if(permissionBoundaryResult === 'ImplicitlyDenied') {
      return {
        result: 'ImplicitlyDenied',
        ...baseResult
      }
    }

    if(resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount') {
      if(identityStatementResult === 'Allowed') {
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
     * * session policies
     * * resource control policies
     * * root user
     * * service linked roles
     * * vpc endpoint policies
     */
  }
}

