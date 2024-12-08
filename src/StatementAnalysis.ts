import { Statement } from "@cloud-copilot/iam-policy";
import { ConditionMatchResult } from "./condition/condition.js";
import { PrincipalMatchResult } from "./principal/principal.js";

/**
 * The result of analyzing a statement against a request.
 *
 */
export interface StatementAnalysis {
  /**
   * The statement being analyzed.
   */
  statement: Statement;

  /**
   * Whether the Resource or NotResource – if any – matches the request.
   */
  resourceMatch: boolean;

  /**
   * Whether the Action or NotAction matches the request.
   */
  actionMatch: boolean;

  /**
   * Whether the Principal or NotPrincipal – if any – matches the request.
   */
  principalMatch: PrincipalMatchResult

  /**
   * Whether the Conditions matches the request.
   */
  conditionMatch: ConditionMatchResult
}

/**
 * Checks if a statement is an identity statement that allows the request.
 *
 * @param statement The statement to check.
 * @returns Whether the statement is an identity statement that allows the request.
 */
export function identityStatementAllows(statement: StatementAnalysis): boolean {
  if(statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Match' &&
    statement.statement.effect() === 'Allow') {
      return true;
  }
  return false;
}

export function identityStatementUknownAllow(statement: StatementAnalysis): boolean {
  if(statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Unknown' &&
    statement.statement.effect() === 'Allow') {
      return true;
  }
  return false
}

export function identityStatementUknownDeny(statement: StatementAnalysis): boolean {
  if(statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Unknown' &&
    statement.statement.effect() === 'Deny') {
      return true;
  }
  return false
}

export function identityStatementExplicitDeny(statement: StatementAnalysis): boolean {
  if(statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Match' &&
    statement.statement.effect() === 'Deny') {
      return true;
  }
  return false;
}