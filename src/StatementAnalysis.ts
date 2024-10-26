import { Statement } from "@cloud-copilot/iam-policy";
import { ConditionMatchResult } from "./condition/condition.js";
import { PrincipalMatchResult } from "./principal/principal.js";

/**
 * The result of analyzing a statement against a request.
 *
 */
export interface StatementAnalysis {
  /**
   * The statement being analyzed.
   */
  statement: Statement;

  /**
   * Whether the Resource or NotResource – if any – matches the request.
   */
  resourceMatch: boolean;

  /**
   * Whether the Action or NotAction matches the request.
   */
  actionMatch: boolean;

  /**
   * Whether the Principal or NotPrincipal – if any – matches the request.
   */
  principalMatch: PrincipalMatchResult
  conditionMatch: ConditionMatchResult
}