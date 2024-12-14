import { Resource, Statement } from "@cloud-copilot/iam-policy";
import { ResourceExplain, StatementExplain } from "../explain/statementExplain.js";
import { AwsRequest } from "../request/request.js";
import { convertIamString, getResourceSegments } from "../util.js";

//TODO: Make a check to see if the action is a wildcard only action. This will have to happen outside of these functions.

/**
 * Convert a resource segment to a regular expression. This is without variables.
 *
 * @param segment the segment to convert to a regular expression
 * @returns a regular that replaces any wildcards in the segment with the appropriate regular expression.
 */
function convertResourceSegmentToRegex(segment: string): RegExp {
  if(segment.indexOf(':') != -1) {
    throw new Error('Segment should not contain a colon');
  }
  const pattern = "^" + segment.replace(/\?/g, '.').replace(/\*/g, '.*?') + "$"
  return new RegExp(pattern, 'i')
}

/**
 * Check if a request matches the Resource or NotResource elements of a statement.
 *
 * @param request the request to check
 * @param statement the statement to check against
 * @returns true if the request matches the resources in the statement, false otherwise
 */
export function requestMatchesStatementResources(request: AwsRequest, statement: Statement): {matches: boolean, details: Pick<StatementExplain, 'resources' | 'notResources'>} {
  if(statement.isResourceStatement()) {
    const {matches, explains} = requestMatchesResources(request, statement.resources());
    if(!statement.resourceIsArray()) {
      return {matches, details: {resources: explains[0]}}
    }
    return {matches, details: {resources: explains}}
    // return requestMatchesResources(request, statement.resources());
  } else if(statement.isNotResourceStatement()) {
    const {matches, explains} = requestMatchesNotResources(request, statement.notResources());
    if(!statement.notResourceIsArray()) {
      return {matches, details: {notResources: explains[0]}}
    }
    return {matches, details: {notResources: explains}}
    // return requestMatchesNotResources(request, statement.notResources());
  }
  return {matches: true, details: {}};
}


/**
 * Check if a request matches a set of resources.
 *
 * @param request the request to check
 * @param policyResources the resources to check against
 * @returns true if the request matches any of the resources, false otherwise
 */
export function requestMatchesResources(request: AwsRequest, policyResources: Resource[]): {matches: boolean, explains: ResourceExplain[]} {
  const explains = policyResources.map(policyResource => singleResourceMatchesRequest(request, policyResource))
  const matches = explains.some(explain => explain.matches)
  return {matches, explains}
}

/**
 * Check if a request matches a NotResource element in a policy.
 *
 * @param request the request to check
 * @param policyResources the resources to check against
 * @returns true if the request does not match any of the resources, false otherwise
 */
export function requestMatchesNotResources(request: AwsRequest, policyResources: Resource[]): {matches: boolean, explains: ResourceExplain[]} {
  const explains = policyResources.map(policyResource => {
    const explain = singleResourceMatchesRequest(request, policyResource)
    explain.matches = !explain.matches
    return explain
  })
  const matches = !explains.some(explain => !explain.matches)
  return {matches, explains}
}

/**
 * Check if a single resource matches a request.
 *
 * @param request the request to check against
 * @param policyResource the resource to check against
 * @returns true if the request matches the resource, false otherwise
 */
function singleResourceMatchesRequest(request: AwsRequest, policyResource: Resource): ResourceExplain {
  if(policyResource.isAllResources()) {
    return {
      resource: policyResource.value(),
      matches: true,
    };
  } else if(policyResource.isArnResource()) {
    if(!request.resource)  {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Request does not have a resource'],
      };
    }

    const resource = request.resource
    if(!convertResourceSegmentToRegex(policyResource.partition()).test(resource.partition())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Partition does not match'],
      }
    }

    if(!convertResourceSegmentToRegex(policyResource.service()).test(resource.service())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Service does not match'],
      }
    }

    if(!convertResourceSegmentToRegex(policyResource.region()).test(resource.region())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Region does not match'],
      }
    }

    if(!convertResourceSegmentToRegex(policyResource.account()).test(resource.account())) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Account does not match'],
      }
    }

    //Wildcards and variables are not allowed in the product segment https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html "Incorrect wildcard usage"
    const [policyProduct, policyResourceId] = getResourceSegments(policyResource.resource())

    if(!resource.resource().startsWith(policyProduct)) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Product does not match'],
      }
    }

    const requestResourceId = resource.resource().slice(policyProduct.length)
    const {pattern, errors} = convertIamString(policyResourceId, request)

    if(!pattern.test(requestResourceId)) {
      return {
        resource: policyResource.value(),
        matches: false,
        errors: ['Resource does not match'],
      }
    }

    return {
      resource: policyResource.value(),
      matches: true,
    }
  } else {
    throw new Error('Unknown resource type');
  }
}

