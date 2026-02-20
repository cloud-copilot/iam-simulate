import { Resource, Statement } from '@cloud-copilot/iam-policy'
import { ResourceExplain, StatementExplain } from '../explain/statementExplain.js'
import { AwsRequest } from '../request/request.js'
import { convertIamString, getResourceSegments } from '../util.js'

/**
 * Convert a resource segment to a regular expression. This is without variables.
 *
 * @param segment the segment to convert to a regular expression
 * @returns a regular that replaces any wildcards in the segment with the appropriate regular expression.
 */
function convertResourceSegmentToRegex(segment: string): RegExp {
  if (segment.indexOf(':') != -1) {
    throw new Error('Segment should not contain a colon')
  }
  const pattern = '^' + segment.replace(/\?/g, '.').replace(/\*/g, '.*?') + '$'
  return new RegExp(pattern, 'i')
}

/**
 * Check if a request matches the Resource or NotResource elements of a statement.
 *
 * @param request the request to check
 * @param statement the statement to check against
 * @returns true if the request matches the resources in the statement, false otherwise
 */
export function requestMatchesStatementResources(
  request: AwsRequest,
  statement: Statement
): { matches: boolean; details: Pick<StatementExplain, 'resources' | 'notResources'> } {
  if (statement.isResourceStatement()) {
    const { matches, explains } = requestMatchesResources(
      request,
      statement.resources(),
      'Resource',
      statement.effect() as 'Allow' | 'Deny'
    )
    if (!statement.resourceIsArray()) {
      return { matches, details: { resources: explains[0] } }
    }
    return { matches, details: { resources: explains } }
  } else if (statement.isNotResourceStatement()) {
    const { matches, explains } = requestMatchesNotResources(
      request,
      statement.notResources(),
      'NotResource',
      statement.effect() as 'Allow' | 'Deny'
    )
    if (!statement.notResourceIsArray()) {
      return { matches, details: { notResources: explains[0] } }
    }
    return { matches, details: { notResources: explains } }
  }
  return { matches: true, details: {} }
}

/**
 * Check if a request matches a set of resources.
 *
 * @param request the request to check
 * @param policyResources the resources to check against
 * @returns true if the request matches any of the resources, false otherwise
 */
export function requestMatchesResources(
  request: AwsRequest,
  policyResources: Resource[],
  resourceType: 'Resource' | 'NotResource',
  effect: 'Allow' | 'Deny'
): { matches: boolean; explains: ResourceExplain[] } {
  const explains = policyResources.map((policyResource) =>
    singleResourceMatchesRequest(request, policyResource, resourceType, effect)
  )
  const matches = explains.some((explain) => explain.matches)
  return { matches, explains }
}

/**
 * Check if a request matches a NotResource element in a policy.
 *
 * @param request the request to check
 * @param policyResources the resources to check against
 * @returns true if the request does not match any of the resources, false otherwise
 */
export function requestMatchesNotResources(
  request: AwsRequest,
  policyResources: Resource[],
  resourceType: 'Resource' | 'NotResource',
  effect: 'Allow' | 'Deny'
): { matches: boolean; explains: ResourceExplain[] } {
  const explains = policyResources.map((policyResource) => {
    const explain = singleResourceMatchesRequest(request, policyResource, resourceType, effect)
    if (!explain.errors) {
      explain.matches = !explain.matches
    }
    return explain
  })
  const matches = !explains.some((explain) => !explain.matches)
  return { matches, explains }
}

/*
Specifications for **request resource** wildcards:
- Asterisks (*) can be used to match any sequence of characters (including an empty sequence)
- Asterisks can appear in any segment of the ARN (partition, service, region, account, resource)
- Asterisks are not greedy, and can be followed or preceded by other characters in the same segment
- Existing rules of matching wildcard segments in ARNs still apply
- Question marks (?) are not supported in the request resource ARN

If the string in the policy is the same as the resolved string after variable substitution, it is a match

For an Allow/Resource Statement:
- If the resolved string matches the request resource, it is a match
- If the resolved string is a superset of the request resource, it is a match
- If the resolved string is a subset of the request resource, it is a match
- If there is no overlap at all between the resolved string and the request resource, it is not a match

For a Deny/Resource Statement:
- If the resolved string matches the request resource, it is a match
- If the resolved string is a superset of the request resource, it is a match
- If the resolved string is a subset of the request resource, it is not a match
- If there is no overlap at all between the resolved string and the request resource, it is not a match

For an Allow/NotResource Statement:
- If the resolved string matches the request resource, it is not a match
- If the resolved string is a superset of the request resource, it is not a match
- If the resolved string is a subset of the request resource, it is a match
- If there is no overlap at all between the resolved string and the request resource, it is a match

For a Deny/NotResource Statement:
- If the resolved string matches the request resource, it is not a match
- If the resolved string is a superset of the request resource, it is not a match
- If the resolved string is a subset of the request resource, it is not a match
- If there is no overlap at all between the resolved string and the request resource, it is a match
*/

/**
 * Check if a single resource matches a request.
 *
 * @param request the request to check against
 * @param policyResource the resource to check against
 * @returns true if the request matches the resource, false otherwise
 */
function singleResourceMatchesRequest(
  request: AwsRequest,
  policyResource: Resource,
  resourceType: 'Resource' | 'NotResource',
  effect: 'Allow' | 'Deny'
): ResourceExplain {
  // Policy is all resources
  if (policyResource.isAllResources()) {
    return {
      resource: policyResource.value(),
      matches: true
    }
  }

  // Request is all resources
  if (request.resource?.isAllResources()) {
    if (effect === 'Allow' && resourceType === 'Resource') {
      return {
        resource: policyResource.value(),
        matches: true
      }
    } else if (effect === 'Allow' && resourceType === 'NotResource') {
      return {
        resource: policyResource.value(),
        matches: false // This gets inverted in the caller
      }
    } else if (effect === 'Deny' && resourceType === 'Resource') {
      // This is a Deny statement that is not all resources, so it's not a match
      return {
        resource: policyResource.value(),
        matches: false
      }
    } else if (effect === 'Deny' && resourceType === 'NotResource') {
      return {
        resource: policyResource.value(),
        matches: true // This gets inverted in the caller
      }
    }
  }

  // Request contains wildcards but neither is a full *
  if (request.resource.hasWildcards() && policyResource.isArnResource()) {
    const overlaps = [
      resourcePatternOverlap(policyResource.partition(), request.resource.partition()),
      resourcePatternOverlap(policyResource.service(), request.resource.service()),
      resourcePatternOverlap(policyResource.region(), request.resource.region()),
      resourcePatternOverlap(policyResource.account(), request.resource.account()),
      resourcePatternOverlap(policyResource.resource(), request.resource.resource())
    ]

    if (resourceType === 'Resource' && effect === 'Allow') {
      if (overlaps.every((o) => o !== 'none')) {
        return {
          resource: policyResource.value(),
          matches: true
        }
      }
    } else if (resourceType === 'Resource' && effect === 'Deny') {
      if (overlaps.some((o) => o === 'none' || o === 'policy_is_subset')) {
        return {
          resource: policyResource.value(),
          matches: false
        }
      }
    } else if (resourceType === 'NotResource' && effect === 'Allow') {
      /*
       * For an Allow/NotResource Statement:
          - If the resolved string matches the request resource, it is not a match
          - If the resolved string is a superset of the request resource, it is not a match
          - If the resolved string is a subset of the request resource, it is a match
          - If there is no overlap at all between the resolved string and the request resource, it is a match
       */
      if (overlaps.every((o) => o === 'equal' || o === 'policy_is_superset')) {
        return {
          resource: policyResource.value(),
          // This gets inverted in the caller
          matches: true
        }
      } else {
        return {
          resource: policyResource.value(),
          // This gets inverted in the caller
          matches: false
        }
      }
    } else if (resourceType === 'NotResource' && effect === 'Deny') {
      /*
        For a Deny/NotResource Statement:
        - If the resolved string matches the request resource, it is not a match
        - If the resolved string is a superset of the request resource, it is not a match
        - If the resolved string is a subset of the request resource, it is not a match
        - If there is no overlap at all between the resolved string and the request resource, it is a match
      */
      if (overlaps.some((o) => o === 'none')) {
        return {
          resource: policyResource.value(),
          // This gets inverted in the caller
          matches: false
        }
      } else {
        return {
          resource: policyResource.value(),
          // This gets inverted in the caller
          matches: true
        }
      }
    } else {
      throw new Error(`Unknown Resource Type and Effect Combination: ${resourceType} ${effect}`)
    }
  }

  if (policyResource.isArnResource()) {
    if (!request.resource) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Request does not have a resource']
      }
    }

    const resource = request.resource
    if (!convertResourceSegmentToRegex(policyResource.partition()).test(resource.partition())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Partition does not match']
      }
    }

    if (!convertResourceSegmentToRegex(policyResource.service()).test(resource.service())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Service does not match']
      }
    }

    if (!convertResourceSegmentToRegex(policyResource.region()).test(resource.region())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Region does not match']
      }
    }

    if (!convertResourceSegmentToRegex(policyResource.account()).test(resource.account())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Account does not match']
      }
    }

    //Wildcards and variables are not allowed in the product segment https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html "Incorrect wildcard usage"
    const [policyProduct, policyResourceId] = getResourceSegments(policyResource)
    if (!resource.resource().startsWith(policyProduct)) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Product does not match']
      }
    }

    const requestResourceId = resource.resource().slice(policyProduct.length)
    const { pattern, errors } = convertIamString(policyResourceId, request)
    const resolvedResourceId = convertIamString(policyResourceId, request, {
      convertToRegex: false,
      replaceWildcards: false
    })
    const resolvedResource =
      policyResource.value().slice(0, policyResource.value().length - policyResourceId.length) +
      resolvedResourceId
    const resolvedValue = resolvedResource === policyResource.value() ? undefined : resolvedResource

    if (!pattern.test(requestResourceId)) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors,
        resolvedValue
      }
    }

    return {
      resource: policyResource.value(),
      matches: true,
      resolvedValue
    }
  } else {
    throw new Error('Unknown resource type')
  }
}

/**
 * Determines if the policy string is equal to, a subset of, a superset of,
 * or has no overlap with the request string.
 *
 * @param policyString the policy string to use
 * @param requestString the request string to compare to the policy string
 * @returns 'equal' if the strings are equal, 'subset' if the policy string is a subset of the request string, 'superset' if the policy string is a superset of the request string, or 'none' if there is no overlap
 */
export function resourcePatternOverlap(
  policyString: string,
  requestString: string
): 'equal' | 'policy_is_subset' | 'policy_is_superset' | 'none' {
  if (policyString === requestString) {
    return 'equal'
  }
  const requestPattern = '^' + requestString.replace(/\*/g, '.*?') + '$'
  if (policyString.match(requestPattern)) {
    return 'policy_is_subset'
  }

  const policyPattern = '^' + policyString.replace(/\?/g, '.').replace(/\*/g, '.*?') + '$'
  if (requestString.match(policyPattern)) {
    return 'policy_is_superset'
  }

  return 'none'
}
