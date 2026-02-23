import { type StatementAnalysis } from './StatementAnalysis.js'

export type EvaluationResult = 'Allowed' | 'ExplicitlyDenied' | 'ImplicitlyDenied'
export type ResourceEvaluationResult =
  | 'NotApplicable'
  | 'Allowed'
  | 'ExplicitlyDenied'
  | 'AllowedForAccount'
  | 'DeniedForAccount'
  | 'ImplicitlyDenied'

export type BlockedReason = 'scp' | 'rcp' | 'vpce' | 'identity' | 'resource' | 'pb'

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
  session?: {
    allow?: IgnoredCondition[]
    deny?: IgnoredCondition[]
  }
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
   * The result of the evaluation of the session policy, if any.
   */
  sessionAnalysis?: IdentityAnalysis | undefined

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
  endpointAnalysis?: IdentityAnalysis | undefined

  /**
   * Any conditions that were ignored during discovery mode.
   */
  ignoredConditions?: IgnoredConditions

  /**
   * If the role session name was ignored during discovery mode.
   */
  ignoredRoleSessionName?: boolean

  /**
   * If the request has policies to allow the request in session, identity, and/or resource policies required, but was blocked
   * by another policy, this includes the policy types that blocked the request.
   *
   * It is possible for a request to have been allowed by the identity policy but blocked by the resource policy and vice versa.
   *
   * If this array is undefined or empty, it means that the core session, identity, and/or resource policies did
   * not grant permission. It does not mean that there are no guardrails in place, just that the request was
   * not allowed by the core policies, so there is no need to look for guardrails that block an otherwise allowed request.
   *
   * "Allowed by core policies" means that it would have been allowed if not for the policies identified in `blockedBy`. So
   * by removing the policies identified in `blockedBy`, the request would be allowed.
   *
   * Use this to discover what guardrails are in place that might block access even if it may be allowed by other policies.
   */
  blockedBy?: BlockedReason[]
}
