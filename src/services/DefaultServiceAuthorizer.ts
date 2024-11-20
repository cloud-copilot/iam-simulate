import { EvaluationResult, ResourceEvaluationResult } from "../evaluate.js";
import { StatementAnalysis } from "../StatementAnalysis.js";
import { ServiceAuthorizationRequest, ServiceAuthorizer } from "./ServiceAuthorizer.js";

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): EvaluationResult {
    const scpResult = this.serviceControlPolicyResult(request);
    const identityStatementResult = this.identityStatementResult(request);
    const resourcePolicyResult = this.resourcePolicyResult(request);

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()

    if(scpResult !== 'Allowed') {
      return scpResult
    }

    if(resourcePolicyResult === 'ExplicitlyDenied' || resourcePolicyResult === 'DeniedForAccount') {
      return 'ExplicitlyDenied'
    }

    if(identityStatementResult === 'ExplicitlyDenied') {
      return 'ExplicitlyDenied'
    }

    //Same Account
    if(principalAccount === resourceAccount) {
      if(resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount' || identityStatementResult === 'Allowed') {
        return 'Allowed'
      }
      return 'ImplicitlyDenied'
    }

    //Cross Account
    if(resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount') {
      if(identityStatementResult === 'Allowed') {
        return 'Allowed'
      }
      return 'ImplicitlyDenied'
    }

    return 'ImplicitlyDenied'

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

  /**
   * Determine the result of the SCP analysis.
   *
   * @param request The request to authorize.
   * @returns The result of the SCP analysis.
   */
  public serviceControlPolicyResult(request: ServiceAuthorizationRequest): EvaluationResult {
    const orgAllows = request.scpAnalysis.map((scpAnalysis) => {
      return scpAnalysis.statementAnalysis.some((statement) => {
        return this.identityStatementAllows(statement)
      })
    })

    if(orgAllows.includes(false)) {
      return 'ImplicitlyDenied'
    }

    const anyScpDeny = request.scpAnalysis.some((scpAnalysis) => {
      return scpAnalysis.statementAnalysis.some((statement) => {
        return this.identityStatementExplicitDeny(statement)
      })
    })

    if(anyScpDeny) {
      return 'ExplicitlyDenied'
    }

    return 'Allowed'
  }

  /**
   * Evaluate the identity statements to determine the result.
   *
   * @param request The request to authorize.
   * @returns The result of the identity statement analysis.
   */
  public identityStatementResult(request: ServiceAuthorizationRequest): EvaluationResult {
    const explicitDeny = request.identityStatements.some(s => this.identityStatementExplicitDeny(s));
    if(explicitDeny) {
      return 'ExplicitlyDenied';
    }

    const explicitAllow = request.identityStatements.some(s => this.identityStatementAllows(s));
    const possibleDeny = request.identityStatements.some(s => this.identityStatementUknownDeny(s));
    if(explicitAllow) {
      return possibleDeny ? 'Unknown' : 'Allowed';
    }

    const possibleAllow = request.identityStatements.some(s => this.identityStatementUknownAllow(s));
    if(possibleAllow) {
      return 'Unknown';
    }

    return 'ImplicitlyDenied'
  }

  /**
   * Evaluate the resource policy to determine the result.
   *
   * @param request the request to authorize
   * @returns the result of the resource policy analysis
   */
  public resourcePolicyResult(request: ServiceAuthorizationRequest): ResourceEvaluationResult {
    if(!request.resourceAnalysis) {
      return 'NotApplicable'
    }

    const denyStatements = request.resourceAnalysis.filter(s => this.identityStatementExplicitDeny(s));
    if(denyStatements.some(s => s.principalMatch === 'Match')) {
      return 'ExplicitlyDenied'
    }
    if(denyStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
      return 'DeniedForAccount'
    }

    const allowStatements = request.resourceAnalysis.filter(s => this.identityStatementAllows(s));
    if(allowStatements.some(s => s.principalMatch === 'Match')) {
      return 'Allowed'
    }
    if(allowStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
      return 'AllowedForAccount'
    }

    return 'ImplicityDenied'

  }

  /**
   * Checks if a statement is an identity statement that allows the request.
   *
   * @param statement The statement to check.
   * @returns Whether the statement is an identity statement that allows the request.
   */
  public identityStatementAllows(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Match' &&
      statement.statement.effect() === 'Allow') {
        return true;
    }
    return false;
  }

  public identityStatementUknownAllow(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Unknown' &&
      statement.statement.effect() === 'Allow') {
        return true;
    }
    return false
  }

  public identityStatementUknownDeny(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Unknown' &&
      statement.statement.effect() === 'Deny') {
        return true;
    }
    return false
  }

  public identityStatementExplicitDeny(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Match' &&
      statement.statement.effect() === 'Deny') {
        return true;
    }
    return false;
  }
}

