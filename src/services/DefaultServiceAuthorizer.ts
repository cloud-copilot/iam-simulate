import { EvaluationResult } from "../evaluate.js";
import { StatementAnalysis } from "../StatementAnalysis.js";
import { ServiceAuthorizationRequest, ServiceAuthorizer } from "./ServiceAuthorizer.js";

export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): EvaluationResult {
    const scpResult = this.servieControlPolicyResult(request);
    const identityStatementResult = this.identityStatementResult(request);
    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()

    if(scpResult !== 'Allowed') {
      return scpResult
    }

    /**
     * Add checks for:
     * * resource policies
     * * boundary policies
     * * vpc endpoint policies
     * * session policies (maybe these are just part of identity policies?)
     */
    if(identityStatementResult === 'Allowed') {
      if(principalAccount === resourceAccount) {
        return identityStatementResult
      }
      return 'ImplicitlyDenied'
    }
    return identityStatementResult;
  }

  public servieControlPolicyResult(request: ServiceAuthorizationRequest): EvaluationResult {
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

  public identityStatementAllows(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Match' &&
      statement.statement.effect() === 'Allow' &&
      statement.principalMatch === 'Match') {
        return true;
    }
    return false;
  }

  public identityStatementUknownAllow(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Unknown' &&
      statement.statement.effect() === 'Allow' &&
      statement.principalMatch === 'Match') {
        return true;
    }
    return false
  }

  public identityStatementUknownDeny(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Unknown' &&
      statement.statement.effect() === 'Deny' &&
      statement.principalMatch === 'Match') {
        return true;
    }
    return false
  }

  public identityStatementExplicitDeny(statement: StatementAnalysis): boolean {
    if(statement.resourceMatch &&
      statement.actionMatch &&
      statement.conditionMatch === 'Match' &&
      statement.statement.effect() === 'Deny' &&
      statement.principalMatch === 'Match') {
        return true;
    }
    return false;
  }
}

