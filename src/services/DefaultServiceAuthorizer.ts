import {
  isAssumedRoleArn,
  isFederatedUserArn,
  isIamRoleArn,
  isIamUserArn,
  isServicePrincipal
} from '@cloud-copilot/iam-utils'
import {
  type BlockedReason,
  type EvaluationResult,
  type RequestAnalysis,
  type ResourceAnalysis
} from '../evaluate.js'
import { type RequestResource } from '../request/requestResource.js'
import { type ServiceAuthorizationRequest, type ServiceAuthorizer } from './ServiceAuthorizer.js'

/**
 * This helper class keeps track of which factors are blocking a request and what the overall result is
 * based on those blocks.
 */
class BlockedByLog {
  private blockedBy: Set<BlockedReason> = new Set()
  private result: EvaluationResult

  /**
   * Create the BlockedByLog
   *
   * @param coreResult the core result of the authorization. Is the request allowed or denied based on the core policies (identity, resource, session).
   */
  constructor(private readonly coreResult: EvaluationResult) {
    this.result = coreResult
  }

  /**
   * Add a blocking factor to the log and update the overall result accordingly.
   *
   * @param reason the reason for the block.
   * @param result the result of the block (ImplicitlyDenied, ExplicitlyDenied)
   */
  add(reason: BlockedReason, result: EvaluationResult) {
    if (this.coreResult === 'Allowed' && result !== 'Allowed') {
      this.blockedBy.add(reason)
    }

    this.setResult(result)
  }

  /**
   * Calculates and sets the new overall result based on the new block reason and the previous result.
   *
   * The result can only be modified down so Allowed -> ImplicitlyDenied -> ExplicitlyDenied.
   *
   * @param newResult the result of the new block reason being added.
   */
  private setResult(newResult: EvaluationResult) {
    // Explicit denies override everything
    if (this.result === 'ExplicitlyDenied') {
      return
    }
    if (newResult === 'ExplicitlyDenied') {
      this.result = 'ExplicitlyDenied'
    } else if (newResult === 'ImplicitlyDenied') {
      this.result = 'ImplicitlyDenied'
    }
  }

  /**
   * Get the overall result after all blocks (if any) have been added.
   *
   * @returns the overall result after all blocks (if any) have been added.
   */
  getResult(): EvaluationResult {
    return this.result
  }

  /**
   * Get the list of reasons that are blocking the request after the core result.
   *
   * @returns an array of reasons that are blocking the request after the core result.
   */
  getBlockedBy(): BlockedReason[] {
    return Array.from(this.blockedBy)
  }
}

/**
 * The default authorizer for services.
 */
export class DefaultServiceAuthorizer implements ServiceAuthorizer {
  /**
   * Authorize a service request after all policy analysis has been completed.
   *
   * @param request the service authorization request containing all analyses
   * @returns the result of the authorization
   */
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const scpResult = request.scpAnalysis.result
    const rcpResult = request.rcpAnalysis.result
    const identityStatementResult = request.identityAnalysis.result
    const resourcePolicyResult = request.resourceAnalysis?.result
    const permissionBoundaryResult = request.permissionBoundaryAnalysis?.result
    const endpointPolicyResult = request.endpointAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    const baseResult: Pick<
      RequestAnalysis,
      | 'sameAccount'
      | 'scpAnalysis'
      | 'rcpAnalysis'
      | 'resourceAnalysis'
      | 'sessionAnalysis'
      | 'identityAnalysis'
      | 'permissionBoundaryAnalysis'
      | 'endpointAnalysis'
      | 'blockedBy'
    > = {
      sameAccount,
      sessionAnalysis: request.sessionAnalysis,
      identityAnalysis: request.identityAnalysis,
      scpAnalysis: request.scpAnalysis,
      rcpAnalysis: request.rcpAnalysis,
      resourceAnalysis: request.resourceAnalysis,
      permissionBoundaryAnalysis: request.permissionBoundaryAnalysis,
      endpointAnalysis: request.endpointAnalysis
    }

    const coreResult = this.initialEvaluationResult(request)
    const blockedByLog = new BlockedByLog(coreResult)

    blockedByLog.add('scp', scpResult)
    blockedByLog.add('rcp', rcpResult)

    if (
      endpointPolicyResult === 'ExplicitlyDenied' ||
      endpointPolicyResult === 'ImplicitlyDenied'
    ) {
      blockedByLog.add('vpce', endpointPolicyResult)
    }

    if (
      resourcePolicyResult === 'ExplicitlyDenied' ||
      resourcePolicyResult === 'DeniedForAccount'
    ) {
      blockedByLog.add('resource', 'ExplicitlyDenied')
    }

    if (identityStatementResult === 'ExplicitlyDenied') {
      blockedByLog.add('identity', 'ExplicitlyDenied')
    }

    if (permissionBoundaryResult === 'ExplicitlyDenied') {
      blockedByLog.add('pb', 'ExplicitlyDenied')
    }

    //Same Account
    if (sameAccount) {
      if (permissionBoundaryResult === 'ImplicitlyDenied') {
        /**
         * If the permission boundary is an implicit deny
         *
         * If the request is from an assumed role ARN AND the resource policy allows the assumed role (session) ARN = ALLOW
         * If the request is from an IAM user ARN AND the resource policy allows the IAM user ARN = ALLOW
         * If the request is from a federated user ARN AND the resource policy allows the federated user ARN = ALLOW
         * The request is allowed: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
         */
        if (resourcePolicyResult === 'Allowed') {
          const principal = request.request.principal.value()
          if (
            isIamRoleArn(principal) &&
            request.simulationParameters.simulationMode === 'Discovery'
          ) {
            // Principal is a role and may match a session. Check since we are in Discovery mode.
            if (
              !request.resourceAnalysis.allowStatements.some(
                (statement) =>
                  statement.principalMatch === 'Match' && statement.ignoredRoleSessionName
              )
            ) {
              blockedByLog.add('pb', 'ImplicitlyDenied')
            }
          } else if (
            isAssumedRoleArn(principal) ||
            isIamUserArn(principal) ||
            isFederatedUserArn(principal)
          ) {
            // If the principal is an assumed role, IAM user, or federated user ARN, check if the resource
            // policy allows the exact ARN.
            if (
              !request.resourceAnalysis.allowStatements.some(
                (statement) => statement.principalMatch === 'Match'
              )
            ) {
              blockedByLog.add('pb', 'ImplicitlyDenied')
            }
          } else {
            // Not in discovery mode or doesn't match a session/user exactly, so the permission boundary implicit deny applies.
            blockedByLog.add('pb', 'ImplicitlyDenied')
          }
        } else {
          // Resource policy doesn't allow the principal, so the permission boundary implicit deny applies.
          blockedByLog.add('pb', 'ImplicitlyDenied')
        }
      }
    } else {
      //Cross Account
      if (permissionBoundaryResult === 'ImplicitlyDenied') {
        blockedByLog.add('pb', 'ImplicitlyDenied')
      }
    }

    const blockedReasons = blockedByLog.getBlockedBy()
    if (blockedReasons.length !== 0) {
      baseResult.blockedBy = blockedReasons
    }

    return {
      result: blockedByLog.getResult(),
      ...baseResult
    }

    /**
     * Add checks for:
     * * root user - can override resource policies for most resource types
     * * organization APIs and delegated admin policy
     */
  }

  /**
   * Determines if the service trusts the principal's Account's IAM policies
   *
   * @param sameAccount - If the principal and resource are in the same account
   * @param resourceAnalysis - The resource policy analysis
   * @returns true if the service trusts the principal's account IAM policies
   */
  serviceTrustsPrincipalAccount(
    sameAccount: boolean,
    resourceAnalysis: ResourceAnalysis,
    resource: RequestResource
  ): boolean {
    if (sameAccount) {
      return true
    }

    return resourceAnalysis.allowStatements.some(
      (statement) => statement.principalMatch === 'AccountLevelMatch'
    )
  }

  /**
   * Evaluations whether the minimum requirements for the request to be allowed are met based on the core policies
   *   - Identity
   *   - Resource
   *   - Session
   *
   * Depending on the service, and whether the principal and resources are in the same account, the requirements may differ.
   * For same account requests, for most services an Allow in the resource policy or the identity policy is sufficient to
   * allow the request, so this function will return 'Allowed'. If there is an explicit deny elsewhere, that is not considered.
   * This function only determines if there are enough core policies to allow the request, and final determination of the
   * request is done elsewhere.
   *
   * @param request the service authorization request containing all analyses
   * @returns 'Allowed' if the core policies allow the request, otherwise may return 'ImplicitlyDenied' or 'ExplicitlyDenied' depending on the analyses
   */
  private initialEvaluationResult(request: ServiceAuthorizationRequest): EvaluationResult {
    const sessionResult = request.sessionAnalysis?.result
    const identityStatementResult = request.identityAnalysis.result
    const resourcePolicyResult = request.resourceAnalysis?.result

    const principalAccount = request.request.principal.accountId()
    const resourceAccount = request.request.resource?.accountId()
    const sameAccount = principalAccount === resourceAccount

    if (sessionResult && sessionResult !== 'Allowed') {
      return sessionResult
    }

    // Service Principals
    if (isServicePrincipal(request.request.principal.value())) {
      // Service principals are allowed if the resource policy allows them
      if (resourcePolicyResult === 'Allowed') {
        return 'Allowed'
      }
      return 'ImplicitlyDenied'
    }

    //Same Account
    if (sameAccount) {
      const trustedAccount = this.serviceTrustsPrincipalAccount(
        sameAccount,
        request.resourceAnalysis,
        request.request.resource
      )
      if (
        resourcePolicyResult === 'Allowed' ||
        (trustedAccount && identityStatementResult === 'Allowed')
      ) {
        return 'Allowed'
      }
      return 'ImplicitlyDenied'
    }

    //Cross Account
    if (resourcePolicyResult === 'Allowed' || resourcePolicyResult === 'AllowedForAccount') {
      if (identityStatementResult === 'Allowed') {
        return 'Allowed'
      }
    }

    return 'ImplicitlyDenied'
  }
}
