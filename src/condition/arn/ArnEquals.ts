import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { ArnLike } from "./ArnLike.js";

export const ArnEquals: BaseConditionOperator = {
  name: 'ArnEquals',
  matches: ArnLike.matches,
  allowsVariables: ArnLike.allowsVariables,
  allowsWildcards: ArnLike.allowsWildcards,
  isNegative: ArnLike.isNegative
}
