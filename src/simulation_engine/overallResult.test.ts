import { describe, expect, it } from 'vitest'
import type { EvaluationResult } from '../evaluate.js'
import { calculateOverallResult } from './overallResult.js'
import type { SimulationResourceResult } from './simulationEngine.js'

function buildResult(result: EvaluationResult): SimulationResourceResult {
  return {
    analysis: {
      result,
      sameAccount: true
    }
  }
}

describe('calculateOverallResult', () => {
  it('should return ImplicitlyDenied when there are no results', () => {
    // Given no simulation results
    const results: SimulationResourceResult[] = []

    // When calculating the overall result
    const overallResult = calculateOverallResult(results)

    // Then the result should be ImplicitlyDenied
    expect(overallResult).toEqual('ImplicitlyDenied')
  })

  it('should return Allowed when any result is Allowed', () => {
    // Given results with at least one Allowed
    const results: SimulationResourceResult[] = [
      buildResult('ImplicitlyDenied'),
      buildResult('Allowed'),
      buildResult('ExplicitlyDenied')
    ]

    // When calculating the overall result
    const overallResult = calculateOverallResult(results)

    // Then the result should be Allowed
    expect(overallResult).toEqual('Allowed')
  })

  it('should return ExplicitlyDenied when all results are ExplicitlyDenied', () => {
    // Given results that are all explicitly denied
    const results: SimulationResourceResult[] = [
      buildResult('ExplicitlyDenied'),
      buildResult('ExplicitlyDenied')
    ]

    // When calculating the overall result
    const overallResult = calculateOverallResult(results)

    // Then the result should be ExplicitlyDenied
    expect(overallResult).toEqual('ExplicitlyDenied')
  })

  it('should return ImplicitlyDenied when results mix explicit and implicit denies', () => {
    // Given results with explicit and implicit denies
    const results: SimulationResourceResult[] = [
      buildResult('ExplicitlyDenied'),
      buildResult('ImplicitlyDenied')
    ]

    // When calculating the overall result
    const overallResult = calculateOverallResult(results)

    // Then the result should be ImplicitlyDenied
    expect(overallResult).toEqual('ImplicitlyDenied')
  })
})
