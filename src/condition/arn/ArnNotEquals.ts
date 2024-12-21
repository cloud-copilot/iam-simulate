import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { ArnNotLike } from "./ArnNotLike.js";

export const ArnNotEquals: BaseConditionOperator = {
  name: 'ArnNotEquals',
  matches: ArnNotLike.matches,
  allowsVariables: ArnNotLike.allowsVariables,
  allowsWildcards: ArnNotLike.allowsWildcards,
  isNegative: ArnNotLike.isNegative
}
