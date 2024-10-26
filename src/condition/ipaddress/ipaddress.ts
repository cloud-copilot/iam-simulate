import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { isIpInCidrV4, isValidCidrV4, isValidIpV4 } from "./ipv4.js";
import { isIpInCidrV6, isValidIpCidrV6 as isValidCidrV6, isValidIpV6 } from "./ipv6.js";

export const IpAddress: BaseConditionOperator = {
  name: 'IpAddress',
  matches: (request, keyValue, policyValues) => {
    if(!isValidIpV4(keyValue) && !isValidIpV6(keyValue)) {
      return false
    }
    return policyValues.some(policyValue => {
      const isV4Cidr = isValidCidrV4(policyValue)
      const isV6Cidr = isValidCidrV6(policyValue)
      if(!isV4Cidr && !isV6Cidr) {
        return false
      }
      if(isV4Cidr) {
        return isValidIpV4(keyValue) && isIpInCidrV4(keyValue, policyValue)
      }
      return isValidIpV6(keyValue) && isIpInCidrV6(keyValue, policyValue)
    })
  },
  allowsVariables: false,
  allowsWildcards: false
}