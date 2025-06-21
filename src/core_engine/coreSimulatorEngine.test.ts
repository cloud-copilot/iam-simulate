import { Condition, loadPolicy } from '@cloud-copilot/iam-policy'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import { AuthorizationRequest, authorize, SimulationParameters } from './CoreSimulatorEngine.js'

function getAllFiles(dir: string, allFiles: string[] = []): string[] {
  const files = readdirSync(dir)

  files.forEach((file) => {
    const filePath = join(dir, file)
    const stats = statSync(filePath)

    if (stats.isDirectory()) {
      // Recursively read directory
      getAllFiles(filePath, allFiles)
    } else {
      // Add file to the list
      allFiles.push(filePath)
    }
  })

  return allFiles
}

const defaultRcp = loadPolicy({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: '*',
      Resource: '*'
    }
  ]
})

describe('coreSimulatorEngine', () => {
  const testFolderPath = resolve(join(__dirname, 'coreEngineTests'))
  const allFiles = getAllFiles(testFolderPath)
  const pickTest: string | undefined = undefined

  for (const testFile of allFiles) {
    const relativePath = testFile.replace(testFolderPath, '').slice(1)
    describe(relativePath, () => {
      const content = readFileSync(testFile, 'utf-8')
      const testCases = JSON.parse(content)
      for (const testCase of testCases) {
        let testFunc: typeof it | typeof it.only | typeof it.skip = it
        if (pickTest === testCase.name) {
          testFunc = it.only
        } else if (testCase.skip) {
          testFunc = it.skip
        }
        testFunc(testCase.name, () => {
          //Given the request
          const { principal, resource, action, context } = testCase.request
          const request = new AwsRequestImpl(
            principal,
            resource,
            action,
            new RequestContextImpl(context)
          )
          // And Policies
          const identityPolicies = testCase.identityPolicies.map((p: any) => loadPolicy(p))
          const serviceControlPolicies = (testCase.serviceControlPolicies || []).map((scp: any) => {
            return {
              orgIdentifier: scp.orgIdentifier,
              policies: scp.policies.map((p: any) => loadPolicy(p))
            }
          })

          const resourceControlPolicies = (testCase.resourceControlPolicies || []).map(
            (rcp: any) => {
              return {
                orgIdentifier: rcp.orgIdentifier,
                //We add a default allow all rcp to every level of the org, just like AWS does.
                policies: [defaultRcp, ...rcp.policies.map((p: any) => loadPolicy(p))]
              }
            }
          )

          const resourcePolicy = testCase.resourcePolicy
            ? loadPolicy(testCase.resourcePolicy)
            : undefined

          const permissionBoundaries = testCase.permissionBoundaries
            ? testCase.permissionBoundaries.map((p: any) => loadPolicy(p))
            : undefined

          const simulationParameters: SimulationParameters = {
            simulationMode: testCase.simulation?.mode || 'Strict',
            strictConditionKeys: new Set(
              testCase.simulation?.strictConditionKeys?.map((k: string) => k.toLowerCase() || [])
            )
          }

          //In an authorization request
          const authorizationRequest: AuthorizationRequest = {
            request,
            identityPolicies,
            serviceControlPolicies,
            resourceControlPolicies,
            resourcePolicy,
            permissionBoundaries,
            simulationParameters
          }

          // When the request is authorized
          const analysis = authorize(authorizationRequest)

          // Then the result should match the expected result
          const expected = testCase.expected
          expect(analysis.result).toEqual(expected.response)

          if (expected.ignoredRoleSessionName) {
            expect(analysis.ignoredRoleSessionName).toEqual(expected.ignoredRoleSessionName)
          } else {
            expect(analysis.ignoredRoleSessionName).toBeFalsy()
          }

          if (expected.ignoredConditions) {
            for (const key of ['scp', 'rcp', 'identity', 'resource', 'permissionBoundary']) {
              const actualAllow = (analysis.ignoredConditions as any)?.[key]?.allow
              const actualDeny = (analysis.ignoredConditions as any)?.[key]?.deny
              if (expected.ignoredConditions[key]?.allow) {
                expect(actualAllow).toBeDefined()
                const actualAllows = actualAllow.map((a: Condition) => ({
                  key: a.conditionKey(),
                  op: a.operation().value(),
                  values: a.conditionValues()
                }))
                expect(actualAllows).toEqual(expected.ignoredConditions[key]?.allow)
              } else {
                expect(actualAllow).toEqual([])
              }

              if (expected.ignoredConditions[key]?.deny) {
                expect(actualDeny).toBeDefined()
                const actualDenies = actualDeny.map((a: Condition) => ({
                  key: a.conditionKey(),
                  op: a.operation().value(),
                  values: a.conditionValues()
                }))
                expect(actualDenies).toEqual(expected.ignoredConditions[key]?.deny)
              } else {
                expect(actualDeny).toEqual([])
              }
            }
          } else {
            let ignoredConditionsUndefinedOrEmpty = true
            if (analysis.ignoredConditions) {
              for (const key of ['scp', 'rcp', 'identity', 'resource', 'permissionBoundary']) {
                const actualAllow = (analysis.ignoredConditions as any)?.[key]?.allow
                const actualDeny = (analysis.ignoredConditions as any)?.[key]?.deny
                if (actualAllow && actualAllow.length > 0) {
                  ignoredConditionsUndefinedOrEmpty = false
                }
                if (actualDeny && actualDeny.length > 0) {
                  ignoredConditionsUndefinedOrEmpty = false
                }
              }
            }
            expect(ignoredConditionsUndefinedOrEmpty).toBe(true)
          }
        })
      }
    })
  }
})
