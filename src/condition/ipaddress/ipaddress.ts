import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { checkIfIpAddress } from "./ip.js";

export const IpAddress: BaseConditionOperator = {
  name: 'IpAddress',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map(policyValue => {
      return checkIfIpAddress(policyValue, keyValue, true)
    })

    return {
      matches: explains.some(explain => explain.matches),
      explains
    }
  },
  allowsVariables: false,
  allowsWildcards: false
}