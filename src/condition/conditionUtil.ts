import { AwsRequest } from "../request/request.js";
import { convertIamString } from "../util.js";

/**
 * Get the resolved value of a condition string.
 *
 * @param value the string to resolve
 * @param request the AWS request with context keys
 * @returns if the resolved value is different from the input value, return the resolved value, otherwise return undefined
 */
export function resolvedValue(value: string, request: AwsRequest): string | undefined {
  const resolvedValue = convertIamString(value, request, {replaceWildcards: false, convertToRegex: false})

  return resolvedValue !== value ? resolvedValue : undefined
}