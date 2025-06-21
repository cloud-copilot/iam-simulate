import { Condition, Statement } from '@cloud-copilot/iam-policy'
import { ConditionMatchResult } from './condition/condition.js'
import { StatementExplain } from './explain/statementExplain.js'
import { PrincipalMatchResult } from './principal/principal.js'

/**
 * The result of analyzing a statement against a request.
 *
 */
export interface StatementAnalysis {
  /**
   * The statement being analyzed.
   */
  statement: Statement

  /**
   * Whether the Resource or NotResource – if any – matches the request.
   */
  resourceMatch: boolean

  /**
   * Whether the Action or NotAction matches the request.
   */
  actionMatch: boolean

  /**
   * Whether the Principal or NotPrincipal – if any – matches the request.
   */
  principalMatch: PrincipalMatchResult

  /**
   * Whether the Conditions matches the request.
   */
  conditionMatch: ConditionMatchResult

  /**
   * The explain of evaluating the statement.
   */
  explain: StatementExplain

  /**
   * Any conditions that were ignored during discovery mode.
   */
  ignoredConditions?: Condition[]

  /**
   * Role Session Name ignored during discovery mode.
   */
  ignoredRoleSessionName?: boolean
}

/**
 * Checks if a statement is an identity statement that allows the request.
 *
 * @param statement The statement to check.
 * @returns Whether the statement is an identity statement that allows the request.
 */
export function identityStatementAllows(statement: StatementAnalysis): boolean {
  if (
    statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Match' &&
    statement.statement.effect() === 'Allow'
  ) {
    return true
  }
  return false
}

// export function identityStatementUknownAllow(statement: StatementAnalysis): boolean {
//   if(statement.resourceMatch &&
//     statement.actionMatch &&
//     statement.conditionMatch === 'Unknown' &&
//     statement.statement.effect() === 'Allow') {
//       return true;
//   }
//   return false
// }

// export function identityStatementUknownDeny(statement: StatementAnalysis): boolean {
//   if(statement.resourceMatch &&
//     statement.actionMatch &&
//     statement.conditionMatch === 'Unknown' &&
//     statement.statement.effect() === 'Deny') {
//       return true;
//   }
//   return false
// }

export function identityStatementExplicitDeny(statement: StatementAnalysis): boolean {
  if (
    statement.resourceMatch &&
    statement.actionMatch &&
    statement.conditionMatch === 'Match' &&
    statement.statement.effect() === 'Deny'
  ) {
    return true
  }
  return false
}

export function statementMatches(
  analysis: Pick<
    StatementAnalysis,
    'actionMatch' | 'conditionMatch' | 'principalMatch' | 'resourceMatch'
  >
): boolean {
  return (
    analysis.resourceMatch &&
    analysis.actionMatch &&
    analysis.conditionMatch === 'Match' &&
    ['Match', 'AccountLevelMatch', 'SessionRoleMatch', 'SessionUserMatch'].includes(
      analysis.principalMatch
    )
  )
}
