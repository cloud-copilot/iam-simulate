import { AwsRequest } from "../../request/request.js";
import { convertIamStringToRegex, isNotDefined, splitArnParts } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const ArnLike: BaseConditionOperator = {
  name: 'ArnLike',
  matches: (request, keyValue, policyValues) => {
    return policyValues.some(policyArn => arnMatches(policyArn, keyValue, request))
  },
  allowsVariables: true,
  allowsWildcards: true
}

/**
 * Checks to see if a single ARN matches in ArnLike format
 *
 * @param policyArn the ARN to check against
 * @param requestArn the ARN to check
 * @param request the request to check
 * @returns if the ARN matches
 */
function arnMatches(policyArn: string, requestArn: string, request: AwsRequest): boolean {
  const policyParts = splitArnParts(policyArn)
  const requestParts = splitArnParts(requestArn)
  // If any of the parts are missing, return false
  if(isNotDefined(policyParts.partition) ||
     isNotDefined(policyParts.service) ||
     isNotDefined(policyParts.region) ||
     isNotDefined(policyParts.accountId) ||
     isNotDefined(policyParts.resource)) {
    return false
  }

  // If any of the parts are missing, return false
  if(isNotDefined(requestParts.partition) ||
     isNotDefined(requestParts.service) ||
     isNotDefined(requestParts.region) ||
     isNotDefined(requestParts.accountId) ||
     isNotDefined(requestParts.resource)) {
    return false
  }

  const replaceAndMatch = (policyPart: string, requestPart: string): boolean => {
    const pattern = convertIamStringToRegex(policyPart, request, {replaceWildcards: true})
    return pattern.test(requestPart)
  }

  return replaceAndMatch(policyParts.partition, requestParts.partition) &&
         replaceAndMatch(policyParts.service, requestParts.service) &&
         replaceAndMatch(policyParts.region, requestParts.region) &&
         replaceAndMatch(policyParts.accountId, requestParts.accountId) &&
         replaceAndMatch(policyParts.resource, requestParts.resource)

}