import {
  EvaluationResult,
  IdentityAnalysis,
  RcpAnalysis,
  RequestAnalysis,
  ResourceAnalysis,
  ScpAnalysis
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

export type DenialPolicyType =
  | 'identity'
  | 'resource'
  | 'scp'
  | 'rcp'
  | 'permissionBoundary'
  | 'endpointPolicy'

export type RequestDenial =
  | {
      policyType: DenialPolicyType
      identifier?: string
      denialType: 'Implicit'
    }
  | {
      policyType: DenialPolicyType
      policyIdentifier?: string
      statementId: string
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

  addSimplePolicyDenials(requestAnalysis.identityAnalysis, 'identity', overallResult, denials)
  addSimplePolicyDenials(requestAnalysis.resourceAnalysis, 'resource', overallResult, denials)
  addOuPolicyDenials(requestAnalysis.scpAnalysis, 'scp', overallResult, denials)
  addOuPolicyDenials(requestAnalysis.rcpAnalysis, 'rcp', overallResult, denials)
  addSimplePolicyDenials(
    requestAnalysis.permissionBoundaryAnalysis,
    'permissionBoundary',
    overallResult,
    denials
  )
  addSimplePolicyDenials(requestAnalysis.endpointAnalysis, 'endpointPolicy', overallResult, denials)

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
  denials: RequestDenial[]
): void {
  if (!analysis) return

  if (analysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
    denials.push({ policyType, denialType: 'Implicit' })
  } else if (analysis.result === 'ExplicitlyDenied' && overallResult === 'ExplicitlyDenied') {
    for (const stmt of analysis.denyStatements) {
      denials.push({
        policyType,
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
  denials: RequestDenial[]
): void {
  if (!analysis) return

  if (analysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
    for (const ou of analysis.ouAnalysis) {
      if (ou.result === 'ImplicitlyDenied') {
        denials.push({ policyType, identifier: ou.orgIdentifier, denialType: 'Implicit' })
      }
    }
  } else if (analysis.result === 'ExplicitlyDenied' && overallResult === 'ExplicitlyDenied') {
    for (const ou of analysis.ouAnalysis) {
      if (ou.result === 'ExplicitlyDenied') {
        for (const stmt of ou.denyStatements) {
          denials.push({
            policyType,
            policyIdentifier: stmt.policyId,
            statementId: stmt.statement.sid() || stmt.statement.index().toString(),
            denialType: 'Explicit'
          })
        }
      }
    }
  }
}
