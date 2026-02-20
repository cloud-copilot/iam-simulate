import { readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import type { EvaluationResult } from '../evaluate.js'
import type { Simulation } from './simulation.js'
import { runSimulation, SimulationResultType } from './simulationEngine.js'
import type { SimulationOptions } from './simulationOptions.js'

interface ExpectedResult {
  resourceType?: string
  resourcePattern?: string
  result?: string
}

interface IntegrationTestCase {
  name: string
  skip?: boolean
  simulation: Simulation
  simulationOptions?: Partial<SimulationOptions>
  expected: {
    resultType: SimulationResultType
    results: ExpectedResult[]
    overallResult?: EvaluationResult
  }
}

function getAllFiles(dir: string, allFiles: string[] = []): string[] {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    const stats = statSync(filePath)
    if (stats.isDirectory()) {
      getAllFiles(filePath, allFiles)
    } else {
      allFiles.push(filePath)
    }
  }
  return allFiles
}

function sortByResourcePattern(a: ExpectedResult, b: ExpectedResult): number {
  return (a.resourcePattern || '').localeCompare(b.resourcePattern || '')
}

describe('simulationEngineIntegration', () => {
  const testFolderPath = resolve(join(__dirname, 'simulationEngineIntegrationTests'))
  const allFiles = getAllFiles(testFolderPath)
  const pickTest: string | undefined = undefined

  for (const testFile of allFiles) {
    const relativePath = testFile.replace(testFolderPath, '').slice(1)
    describe(relativePath, () => {
      const content = readFileSync(testFile, 'utf-8')
      const testCases: IntegrationTestCase[] = JSON.parse(content)
      for (const testCase of testCases) {
        let testFunc: typeof it | typeof it.only | typeof it.skip = it
        if (pickTest === testCase.name) {
          testFunc = it.only
        } else if (testCase.skip) {
          testFunc = it.skip
        }

        testFunc(testCase.name, async () => {
          const response = await runSimulation(
            testCase.simulation,
            testCase.simulationOptions || {}
          )

          expect(response.resultType).toEqual(testCase.expected.resultType)
          if (response.resultType !== 'wildcard') {
            throw new Error('Expected wildcard simulation results')
          }
          if (testCase.expected.overallResult) {
            expect(response.overallResult, 'Overall Result').toEqual(
              testCase.expected.overallResult
            )
          }

          const normalizedResults: ExpectedResult[] = response.results.map((result) => ({
            resourceType: result.resourceType,
            resourcePattern: result.resourcePattern,
            result: result.analysis?.result
          }))

          const expectedResults = [...testCase.expected.results]

          expect(normalizedResults.sort(sortByResourcePattern)).toEqual(
            expectedResults.sort(sortByResourcePattern)
          )
        })
      }
    })
  }
})
