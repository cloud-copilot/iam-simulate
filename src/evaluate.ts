import { StatementAnalysis } from "./StatementAnalysis.js";

export type EvaluationResult = 'Allowed' | 'ExplicitlyDenied' | 'AllowedWithConditions' | 'ImplicitlyDenied' | 'Unknown';
export type ResourceEvaluationResult = 'NotApplicable' | 'Allowed' | 'ExplicitlyDenied' | 'AllowedForAccount' | 'DeniedForAccount' | 'ImplicityDenied';

/**
 * The analysis of a request.
 */
export interface RequestAnalysis {
  /**
   * The result of the evaluation.
   */
  result: EvaluationResult;

  /**
   * The result of the evaluation of the resource policy.
   */
  identityStatements?: {
    /**
     * The identity statements that matched the request
     */
    matched?: StatementAnalysis[]

    /**
     * The identity statements that did not match the request
     */
    unmatched?: StatementAnalysis[]
  }

  /**
   * The result of the evaluation of the resource policy.
   */
  resourceStatements?: {

    /**
     * The resource statement that matched the request
     */
    matched?: StatementAnalysis[]

    /**
     * The resource statements that did not match the request
     */
    unmatched?: StatementAnalysis[]
  }

  /**
   * The result of the evaluation of the service control policies.
   */
  scpStatements?: {

    /**
     * The organization identifier for the organizational unit these policies apply to.
     */
    orgIdentifier: string

    /**
     * The SCP statements that matched the request
     */
    matched?: StatementAnalysis[]

    /**
     * The SCP statements that did not match the request
     */
    unmatched?: StatementAnalysis[]
  }[]
}
