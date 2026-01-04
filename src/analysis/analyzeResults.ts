import { RequestAnalysis } from '../evaluate.js'

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
  const denyingStatements: RequestDenial[] = []

  const overallResult = requestAnalysis.result

  const identityAnalysis = requestAnalysis.identityAnalysis
  if (identityAnalysis) {
    if (identityAnalysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
      denyingStatements.push({
        policyType: 'identity',
        denialType: 'Implicit'
      })
    } else if (
      identityAnalysis.result === 'ExplicitlyDenied' &&
      overallResult === 'ExplicitlyDenied'
    ) {
      for (const stmt of identityAnalysis.denyStatements) {
        denyingStatements.push({
          policyType: 'identity',
          policyIdentifier: stmt.policyId,
          statementId: stmt.statement.sid() || stmt.statement.index().toString(),
          denialType: 'Explicit'
        })
      }
    }
  }

  const resourceAnalysis = requestAnalysis.resourceAnalysis
  if (resourceAnalysis) {
    if (resourceAnalysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
      denyingStatements.push({
        policyType: 'resource',
        denialType: 'Implicit'
      })
    } else if (
      resourceAnalysis.result === 'ExplicitlyDenied' &&
      overallResult === 'ExplicitlyDenied'
    ) {
      for (const stmt of resourceAnalysis.denyStatements) {
        denyingStatements.push({
          policyType: 'resource',
          statementId: stmt.statement.sid() || stmt.statement.index().toString(),
          denialType: 'Explicit'
        })
      }
    }
  }

  const scpAnalysis = requestAnalysis.scpAnalysis
  if (scpAnalysis) {
    if (scpAnalysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
      for (const ou of scpAnalysis.ouAnalysis) {
        if (ou.result === 'ImplicitlyDenied') {
          denyingStatements.push({
            policyType: 'scp',
            identifier: ou.orgIdentifier,
            denialType: 'Implicit'
          })
        }
      }
    } else if (scpAnalysis.result === 'ExplicitlyDenied' && overallResult === 'ExplicitlyDenied') {
      for (const ou of scpAnalysis.ouAnalysis) {
        if (ou.result === 'ExplicitlyDenied') {
          for (const stmt of ou.denyStatements) {
            denyingStatements.push({
              policyType: 'scp',
              policyIdentifier: stmt.policyId,
              statementId: stmt.statement.sid() || stmt.statement.index().toString(),
              denialType: 'Explicit'
            })
          }
        }
      }
    }
  }

  const rcpAnalysis = requestAnalysis.rcpAnalysis
  if (rcpAnalysis) {
    if (rcpAnalysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
      for (const ou of rcpAnalysis.ouAnalysis) {
        if (ou.result === 'ImplicitlyDenied') {
          denyingStatements.push({
            policyType: 'rcp',
            identifier: ou.orgIdentifier,
            denialType: 'Implicit'
          })
        }
      }
    } else if (rcpAnalysis.result === 'ExplicitlyDenied' && overallResult === 'ExplicitlyDenied') {
      for (const ou of rcpAnalysis.ouAnalysis) {
        if (ou.result === 'ExplicitlyDenied') {
          for (const stmt of ou.denyStatements) {
            denyingStatements.push({
              policyType: 'rcp',
              policyIdentifier: stmt.policyId,
              statementId: stmt.statement.sid() || stmt.statement.index().toString(),
              denialType: 'Explicit'
            })
          }
        }
      }
    }
  }

  const permissionBoundaryAnalysis = requestAnalysis.permissionBoundaryAnalysis
  if (permissionBoundaryAnalysis) {
    if (
      permissionBoundaryAnalysis.result === 'ImplicitlyDenied' &&
      overallResult === 'ImplicitlyDenied'
    ) {
      denyingStatements.push({
        policyType: 'permissionBoundary',
        denialType: 'Implicit'
      })
    } else if (
      permissionBoundaryAnalysis.result === 'ExplicitlyDenied' &&
      overallResult === 'ExplicitlyDenied'
    ) {
      for (const stmt of permissionBoundaryAnalysis.denyStatements) {
        denyingStatements.push({
          policyType: 'permissionBoundary',
          policyIdentifier: stmt.policyId,
          statementId: stmt.statement.sid() || stmt.statement.index().toString(),
          denialType: 'Explicit'
        })
      }
    }
  }

  const endpointAnalysis = requestAnalysis.endpointAnalysis
  if (endpointAnalysis) {
    if (endpointAnalysis.result === 'ImplicitlyDenied' && overallResult === 'ImplicitlyDenied') {
      denyingStatements.push({
        policyType: 'endpointPolicy',
        denialType: 'Implicit'
      })
    } else if (
      endpointAnalysis.result === 'ExplicitlyDenied' &&
      overallResult === 'ExplicitlyDenied'
    ) {
      for (const stmt of endpointAnalysis.denyStatements) {
        denyingStatements.push({
          policyType: 'endpointPolicy',
          policyIdentifier: stmt.policyId,
          statementId: stmt.statement.sid() || stmt.statement.index().toString(),
          denialType: 'Explicit'
        })
      }
    }
  }

  return denyingStatements
}
