import { ConditionValueExplain } from "../../explain/statementExplain.js";
import { isIpInCidrV4, isValidCidrV4, isValidIpV4 } from "./ipv4.js";
import { isIpInCidrV6, isValidIpCidrV6, isValidIpV6 } from "./ipv6.js";

/**
 * Check if the request value is within the policy value CIDR block if the policy value is a valid CIDR block.
 *
 * @param policyValue - The CIDR block to check against.
 * @param requestValue - The IP address to check.
 * @returns An object explaining the result.
 */
export function checkIfIpAddress(policyValue: string, requestValue: string, expectInCidr: boolean): ConditionValueExplain {
  if(isValidCidrV4(policyValue)) {
    if(isValidIpV6(requestValue)) {
      return {
        matches: false == expectInCidr,
        value: policyValue,
      }
    }
    if(!isValidIpV4(requestValue)) {
      return {
        matches: false,
        value: policyValue
      }
    }

    return {
      matches: isIpInCidrV4(requestValue, policyValue) == expectInCidr,
      value: policyValue
    }
  }
  if(isValidIpCidrV6(policyValue)) {
    if(isValidIpV4(requestValue)) {
      return {
        matches: false == expectInCidr,
        value: policyValue
      }
    }
    if(!isValidIpV6(requestValue)) {
      return {
        matches: false,
        value: policyValue,
        errors: [`Request value '${requestValue}' not a valid IPv6 address`]
      }
    }

    return {
      matches: isIpInCidrV6(requestValue, policyValue) == expectInCidr,
      value: policyValue
    }
  }

  return {
    matches: false,
    value: policyValue,
    errors: [`${policyValue} is not a valid CIDR block`]
  }
}