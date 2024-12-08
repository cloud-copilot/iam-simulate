import { StatementAnalysis } from "./StatementAnalysis.js";

export type EvaluationResult = 'Allowed' | 'ExplicitlyDenied' | 'AllowedWithConditions' | 'ImplicitlyDenied' | 'Unknown';
export type ResourceEvaluationResult = 'NotApplicable' | 'Allowed' | 'ExplicitlyDenied' | 'AllowedForAccount' | 'DeniedForAccount' | 'ImplicityDenied';

export interface IdentityAnalysis {
  result: EvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface ResourceAnalysis {
  result: ResourceEvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface OuScpAnalysis {
  orgIdentifier: string
  result: EvaluationResult
  denyStatements: StatementAnalysis[]
  allowStatements: StatementAnalysis[]
  unmatchedStatements: StatementAnalysis[]
}

export interface ScpAnalysis {
  /**
   * OU Result
   */
  result: EvaluationResult
  ouAnalysis: OuScpAnalysis[]
}

/**
 * The analysis of a request.
 */
export interface RequestAnalysis {
  /**
   * The result of the evaluation.
   */
  result: EvaluationResult;

  sameAccount: boolean;

  /**
   * The result of the evaluation of the resource policy.
   */
  identityAnalysis?: IdentityAnalysis

  /**
   * The result of the evaluation of the resource policy.
   */
  resourceAnalysis?: ResourceAnalysis

  scpAnalysis?: ScpAnalysis
}
