import { EvaluationResult, RequestAnalysis } from "../evaluate.js";
import { identityStatementAllows, identityStatementExplicitDeny, identityStatementUknownAllow, identityStatementUknownDeny } from "../StatementAnalysis.js";
import { ServiceAuthorizationRequest, ServiceAuthorizer } from "./ServiceAuthorizer.js";

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const scpResult = request.scpAnalysis.result;
    const identityStatementResult = this.identityStatementResult(request);
    const resourcePolicyResult = request.resourceAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    const baseResult: Pick<RequestAnalysis, 'sameAccount' | 'scpAnalysis' | 'resourceAnalysis' > = {
      sameAccount,
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
     * * root user
     * * service linked roles
     * * resource control policies
     * * boundary policies
     * * vpc endpoint policies
     * * session policies (maybe these are just part of identity policies?)
     */
  }

  // /**
  //  * Determine the result of the SCP analysis.
  //  *
  //  * @param request The request to authorize.
  //  * @returns The result of the SCP analysis.
  //  */
  // public serviceControlPolicyResult(request: ServiceAuthorizationRequest): EvaluationResult {


  //   //CAN I MOVE THIS TO THE CORE SIMULATOR ENGINE?

  //   const orgAllows = request.scpAnalysis.map((scpAnalysis) => {
  //     return scpAnalysis.statementAnalysis.some((statement) => {
  //       return identityStatementAllows(statement)
  //     })
  //   })

  //   if(orgAllows.includes(false)) {
  //     return 'ImplicitlyDenied'
  //   }

  //   const anyScpDeny = request.scpAnalysis.some((scpAnalysis) => {
  //     return scpAnalysis.statementAnalysis.some((statement) => {
  //       return identityStatementExplicitDeny(statement)
  //     })
  //   })

  //   if(anyScpDeny) {
  //     return 'ExplicitlyDenied'
  //   }

  //   return 'Allowed'
  // }

  /**
   * Evaluate the identity statements to determine the result.
   *
   * @param request The request to authorize.
   * @returns The result of the identity statement analysis.
   */
  public identityStatementResult(request: ServiceAuthorizationRequest): EvaluationResult {
    const explicitDeny = request.identityStatements.some(s => identityStatementExplicitDeny(s));
    if(explicitDeny) {
      return 'ExplicitlyDenied';
    }

    const explicitAllow = request.identityStatements.some(s => identityStatementAllows(s));
    const possibleDeny = request.identityStatements.some(s => identityStatementUknownDeny(s));
    if(explicitAllow) {
      return possibleDeny ? 'Unknown' : 'Allowed';
    }

    const possibleAllow = request.identityStatements.some(s => identityStatementUknownAllow(s));
    if(possibleAllow) {
      return 'Unknown';
    }

    return 'ImplicitlyDenied'
  }

  // /**
  //  * Evaluate the resource policy to determine the result.
  //  *
  //  * @param request the request to authorize
  //  * @returns the result of the resource policy analysis
  //  */
  // public resourcePolicyResult(request: ServiceAuthorizationRequest): ResourceEvaluationResult {
  //   if(!request.resourceAnalysis) {
  //     return 'NotApplicable'
  //   }

  //   const denyStatements = request.resourceAnalysis.filter(s => identityStatementExplicitDeny(s));
  //   if(denyStatements.some(s => s.principalMatch === 'Match')) {
  //     return 'ExplicitlyDenied'
  //   }
  //   if(denyStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
  //     return 'DeniedForAccount'
  //   }

  //   const allowStatements = request.resourceAnalysis.filter(s => identityStatementAllows(s));
  //   if(allowStatements.some(s => s.principalMatch === 'Match')) {
  //     return 'Allowed'
  //   }
  //   if(allowStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
  //     return 'AllowedForAccount'
  //   }

  //   return 'ImplicityDenied'

  // }


}

