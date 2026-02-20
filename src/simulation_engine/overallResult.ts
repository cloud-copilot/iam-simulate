import type { EvaluationResult } from '../evaluate.js'
import type { SimulationResourceResult } from './simulationEngine.js'

/**
 * Calculates the overall evaluation result from multiple simulation resource results.
 *
 * @param results Array of simulation resource results to evaluate
 * @returns The overall evaluation result following AWS IAM evaluation logic:
 *   - 'Allowed' if any result is allowed
 *   - 'ExplicitlyDenied' if all results are explicitly denied
 *   - 'ImplicitlyDenied' for all other cases (including empty results)
 */
export function calculateOverallResult(results: SimulationResourceResult[]): EvaluationResult {
  if (results.length === 0) {
    return 'ImplicitlyDenied'
  }

  let hasExplicitlyDenied = false
  let hasImplicitlyDenied = false

  for (const result of results) {
    const evaluationResult = result.analysis?.result
    if (evaluationResult === 'Allowed') {
      return 'Allowed'
    }
    if (evaluationResult === 'ExplicitlyDenied') {
      hasExplicitlyDenied = true
      continue
    }
    hasImplicitlyDenied = true
  }

  if (hasExplicitlyDenied && !hasImplicitlyDenied) {
    return 'ExplicitlyDenied'
  }

  return 'ImplicitlyDenied'
}
