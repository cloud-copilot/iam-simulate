import { StatementAnalysis } from './StatementAnalysis.js'

export type EvaluationResult = 'Allowed' | 'ExplicitlyDenied' | 'ImplicitlyDenied'
export type ResourceEvaluationResult =
  | 'NotApplicable'
  | 'Allowed'
  | 'ExplicitlyDenied'
  | 'AllowedForAccount'
  | 'DeniedForAccount'
  | 'ImplicitlyDenied'

export interface IdentityAnalysis {
  result: EvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface ResourceAnalysis {
  result: ResourceEvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface OuScpAnalysis {
  orgIdentifier: string
  result: EvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface ScpAnalysis {
  /**
   * OU Result
   */
  result: EvaluationResult
  ouAnalysis: OuScpAnalysis[]
}

export interface OuRcpAnalysis {
  orgIdentifier: string
  result: EvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface RcpAnalysis {
  /**
   * OU Result
   */
  result: EvaluationResult
  ouAnalysis: OuRcpAnalysis[]
}

export interface IgnoredCondition {
  op: string
  key: string
  values: string[]
}

/**
 * Conditions that were ignored during discovery mode.
 */
export interface IgnoredConditions {
  scp?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
  rcp?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
  identity?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
  resource?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
  permissionBoundary?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
  endpointPolicy?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
}

/**
 * The analysis of a request.
 */
export interface RequestAnalysis {
  /**
   * The result of the evaluation.
   */
  result: EvaluationResult

  /**
   * Whether the principal and the resource are in the same account.
   */
  sameAccount: boolean

  /**
   * The result of the evaluation of the resource policy.
   */
  identityAnalysis?: IdentityAnalysis

  /**
   * The result of the evaluation of the resource policy.
   */
  resourceAnalysis?: ResourceAnalysis

  /**
   * The result of the evaluation of the SCPs
   */
  scpAnalysis?: ScpAnalysis

  /**
   * The result of the evaluation of the RCPs
   */
  rcpAnalysis?: RcpAnalysis

  /**
   * The result of the evaluation of the permission boundary.
   */
  permissionBoundaryAnalysis?: IdentityAnalysis | undefined

  /**
   * The result of the evaluation of the VPC endpoint policies, if any.
   */
  endpointPolicyAnalysis?: IdentityAnalysis | undefined

  /**
   * Any conditions that were ignored during discovery mode.
   */
  ignoredConditions?: IgnoredConditions

  /**
   * If the role session name was ignored during discovery mode.
   */
  ignoredRoleSessionName?: boolean
}
