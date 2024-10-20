import { Resource } from "@cloud-copilot/iam-policy";
import { AwsRequest } from "../request/request.js";
import { convertIamStringToRegex, getResourceSegments } from "../util.js";

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
 * Check if a request matches a set of resources.
 *
 * @param request the request to check
 * @param policyResources the resources to check against
 * @returns true if the request matches any of the resources, false otherwise
 */
export function requestMatchesResources(request: AwsRequest, policyResources: Resource[]): boolean {
  return policyResources.some(policyResource => singleResourceMatchesRequest(request, policyResource))
}

export function requestMatchesNotResources(request: AwsRequest, policyResources: Resource[]): boolean {
  return !requestMatchesResources(request, policyResources)
}

/**
 * Check if a single resource matches a request.
 *
 * @param request the request to check against
 * @param policyResource the resource to check against
 * @returns true if the request matches the resource, false otherwise
 */
function singleResourceMatchesRequest(request: AwsRequest, policyResource: Resource): boolean {
  if(policyResource.isAllResources()) {
    return true;
  } else if(policyResource.isArnResource()) {
    if(!request.resource)  {
      return false
    }

    const resource = request.resource
    if(!convertResourceSegmentToRegex(policyResource.partition()).test(resource.partition())) {
      return false
    }

    if(!convertResourceSegmentToRegex(policyResource.service()).test(resource.service())) {
      return false
    }

    if(!convertResourceSegmentToRegex(policyResource.region()).test(resource.region())) {
      return false
    }

    if(!convertResourceSegmentToRegex(policyResource.account()).test(resource.account())) {
      return false
    }

    //Wildcards and variables are not allowed in the product segment https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html "Incorrect wildcard usage"
    const [policyProduct, policyResourceId] = getResourceSegments(policyResource.resource())

    if(!resource.resource().startsWith(policyProduct)) {
      return false
    }

    const requestResourceId = resource.resource().slice(policyProduct.length)

    if(!convertIamStringToRegex(policyResourceId, request).test(requestResourceId)) {
      return false
    }

    return true
  } else {
    throw new Error('Unknown resource type');
  }
}

