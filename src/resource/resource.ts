import { Resource } from "@cloud-copilot/iam-policy";
import { Request } from "../request/request.js";

//TODO: Make a check to see if the action is a wildcard only action

/**
 * Convert a resource segment to a regular expression.
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


export function requestMatchesResources(request: Request, policyResources: Resource[]): boolean {
  return policyResources.some(policyResource => singleResourceMatchesRequest(request, policyResource))
}

function singleResourceMatchesRequest(request: Request, policyResource: Resource): boolean {
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

    //Interpreting variables
    //Only the last segement
    //Only single value keys
    //Keys are case insensitive
    //Policy version must be 2012-10-17
    //https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#policy-vars-wheretouse
    //Default Values: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#policy-vars-default-values
    //Special Characters: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#policy-vars-specialchars
    if(!convertResourceSegmentToRegex(policyResource.resource()).test(resource.resource())) {
      return false
    }
  } else {
    throw new Error('Unknown resource type');
  }

  return false;
}
