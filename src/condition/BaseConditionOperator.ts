import { AwsRequest } from "../request/request.js";

export interface BaseConditionOperator {
  name: string;
  matches: (request: AwsRequest, keyValue: string, policyValues: string[]) => boolean
  allowsVariables: boolean
  allowsWildcards: boolean
}