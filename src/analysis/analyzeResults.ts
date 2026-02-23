import {
  type BlockedReason,
  type EvaluationResult,
  type IdentityAnalysis,
  type RcpAnalysis,
  type RequestAnalysis,
  type ResourceAnalysis,
  type ScpAnalysis
} from '../evaluate.js'

/**
 * Analyze a RequestAnalysis to see if the request was allowed by identity policies.
 *
 * @param requestAnalysis the request analysis
 * @returns true if the request was allowed by identity policies, false otherwise
 */
export function isAllowedByIdentityPolicies(requestAnalysis: RequestAnalysis): boolean {
  const identityAnalysis = requestAnalysis.identityAnalysis
  if (!identityAnalysis) {
    return false
  }

  return identityAnalysis.result === 'Allowed'
}

export type DenialPolicyType = BlockedReason

export type RequestDenial =
  | {
      /**
       * The type of policy that caused the denial.
       */
      policyType: DenialPolicyType

      /**
       * This denial blocks a request that otherwise could have been allowed.
       */
      blocking?: true

      /**
       * The identifier of the policy that caused the denial, if applicable. This could be a
       * policy identifier or an organizational unit identifier for SCPs and RCPs.
       */
      identifier?: string

      /**
       * The type of denial.
       */
      denialType: 'Implicit'
    }
  | {
      /**
       * The type of policy that caused the denial.
       */
      policyType: DenialPolicyType

      /**
       * This denial blocks a request that otherwise could have been allowed.
       */
      blocking?: true

      /**
       * The identifier of the policy that caused the denial. May be undefined, for example
       * in a resource policy.
       */
      policyIdentifier?: string

      /**
       * The statement ID (or index) of the denying statement, if applicable.
       */
      statementId: string

      /**
       * The type of denial.
       */
      denialType: 'Explicit'
    }

/**
 * Find the policy statements that caused a request to be denied.
 * Analyzes the RequestAnalysis and returns the specific reasons why the request was denied.
 *
 * For an implicit denial, it returns:
 * - the policy type (identity, resource, scp, rcp, permission boundary, endpoint policy)
 * - the identifier, if applicable for an Organizational Unit identifier for SCPs.
 *
 * For an explicit denial, it returns:
 * - the policy type (identity, resource, scp, rcp, permission boundary, endpoint policy)
 * - the policy identifier, if applicable for a managed policy or an SCP
 * - the statement ID (or index) of the denying statement.
 *
 * @param requestAnalysis the request analysis
 * @returns a list of RequestDenial objects describing the reasons for denial
 */
export function getDenialReasons(requestAnalysis: RequestAnalysis): RequestDenial[] {
  const denials: RequestDenial[] = []
  const overallResult = requestAnalysis.result
  const blockedBy = new Set(requestAnalysis.blockedBy ?? [])

  addSimplePolicyDenials(
    requestAnalysis.identityAnalysis,
    'identity',
    overallResult,
    blockedBy,
    denials
  )
  addSimplePolicyDenials(
    requestAnalysis.resourceAnalysis,
    'resource',
    overallResult,
    blockedBy,
    denials
  )
  addOuPolicyDenials(requestAnalysis.scpAnalysis, 'scp', overallResult, blockedBy, denials)
  addOuPolicyDenials(requestAnalysis.rcpAnalysis, 'rcp', overallResult, blockedBy, denials)
  addSimplePolicyDenials(
    requestAnalysis.permissionBoundaryAnalysis,
    'pb',
    overallResult,
    blockedBy,
    denials
  )
  addSimplePolicyDenials(
    requestAnalysis.endpointAnalysis,
    'vpce',
    overallResult,
    blockedBy,
    denials
  )

  return denials
}

/**
 * Helper for identity-style policies (identity, resource, permissionBoundary, endpoint).
 * Adds denial reasons from a simple policy analysis.
 */
function addSimplePolicyDenials(
  analysis: IdentityAnalysis | ResourceAnalysis | undefined,
  policyType: DenialPolicyType,
  overallResult: EvaluationResult,
  blockedBy: Set<BlockedReason>,
  denials: RequestDenial[]
): void {
  if (!analysis) return

  const isBlocking = blockedBy.has(policyType)
  const blocking = isBlocking ? { blocking: true as const } : {}

  if (
    analysis.result === 'ImplicitlyDenied' &&
    (isBlocking || overallResult === 'ImplicitlyDenied')
  ) {
    denials.push({
      policyType,
      denialType: 'Implicit',
      ...blocking
    })
  } else if (
    analysis.result === 'ExplicitlyDenied' &&
    (isBlocking || overallResult === 'ExplicitlyDenied')
  ) {
    for (const stmt of analysis.denyStatements) {
      denials.push({
        policyType,
        ...blocking,
        policyIdentifier: stmt.policyId,
        statementId: stmt.statement.sid() || stmt.statement.index().toString(),
        denialType: 'Explicit'
      })
    }
  }
}

/**
 * Helper for OU-based policies (scp, rcp).
 * Adds denial reasons from an organizational policy analysis.
 */
function addOuPolicyDenials(
  analysis: ScpAnalysis | RcpAnalysis | undefined,
  policyType: DenialPolicyType,
  overallResult: EvaluationResult,
  blockedBy: Set<BlockedReason>,
  denials: RequestDenial[]
): void {
  if (!analysis) return

  const isBlocking = blockedBy.has(policyType)
  const blocking = isBlocking ? { blocking: true as const } : {}

  if (
    analysis.result === 'ImplicitlyDenied' &&
    (isBlocking || overallResult === 'ImplicitlyDenied')
  ) {
    for (const ou of analysis.ouAnalysis) {
      if (ou.result === 'ImplicitlyDenied') {
        denials.push({
          policyType,
          identifier: ou.orgIdentifier,
          denialType: 'Implicit',
          ...blocking
        })
      }
    }
  } else if (
    analysis.result === 'ExplicitlyDenied' &&
    (isBlocking || overallResult === 'ExplicitlyDenied')
  ) {
    for (const ou of analysis.ouAnalysis) {
      if (ou.result === 'ExplicitlyDenied') {
        for (const stmt of ou.denyStatements) {
          denials.push({
            policyType,
            policyIdentifier: stmt.policyId,
            statementId: stmt.statement.sid() || stmt.statement.index().toString(),
            denialType: 'Explicit',
            ...blocking
          })
        }
      }
    }
  }
}
