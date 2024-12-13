import { RequestAnalysis } from "../evaluate.js";
import { ServiceAuthorizationRequest, ServiceAuthorizer } from "./ServiceAuthorizer.js";

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const scpResult = request.scpAnalysis.result;
    const identityStatementResult = request.identityAnalysis.result;
    const resourcePolicyResult = request.resourceAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    const baseResult: Pick<RequestAnalysis, 'sameAccount' | 'scpAnalysis' | 'resourceAnalysis' | 'identityAnalysis' > = {
      sameAccount,
      identityAnalysis: request.identityAnalysis,
      scpAnalysis: request.scpAnalysis,
      resourceAnalysis: request.resourceAnalysis
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

    //Same Account
    if(principalAccount === resourceAccount) {
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
     * * boundary policies
     * * session policies (maybe these are just part of identity policies?)
     * * resource control policies
     * * root user
     * * service linked roles


     * * vpc endpoint policies

     */
  }
}

