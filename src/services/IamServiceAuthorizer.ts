import { RequestAnalysis } from '../evaluate.js'
import { splitArnParts } from '../util.js'
import { DefaultServiceAuthorizer } from './DefaultServiceAuthorizer.js'
import { ServiceAuthorizationRequest } from './ServiceAuthorizer.js'

const deniedActionsForManagedPolicies = new Set([
  'iam:createpolicy',
  'iam:createpolicyversion',
  'iam:deletepolicy',
  'iam:deletepolicyversion',
  'iam:setdefaultpolicyversion',
  'iam:tagpolicy',
  'iam:untagpolicy'
])

/**
 * Service authorizer for IAM service requests.
 */
export class IamServiceAuthorizer extends DefaultServiceAuthorizer {
  public authorize(request: ServiceAuthorizationRequest): RequestAnalysis {
    const baseResult = super.authorize(request)

    const resourceParts = splitArnParts(request.request.resource.value())
    // If the request is for a managed policy and the action is one of the denied actions,
    // we return implicitly denied.
    if (
      deniedActionsForManagedPolicies.has(request.request.action.value().toLowerCase()) &&
      resourceParts.resource?.startsWith('policy/') &&
      resourceParts.accountId == 'aws'
    ) {
      return {
        ...baseResult,
        result: 'ImplicitlyDenied'
      }
    }

    return baseResult
  }
}
