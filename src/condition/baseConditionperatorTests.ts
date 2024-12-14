import { describe, expect } from "vitest"
import { AwsRequestImpl } from "../request/request.js"
import { RequestContextImpl } from "../requestContext.js"
import { BaseConditionOperator } from "./BaseConditionOperator.js"

export interface BaseOperatorTest {
  name: string
  requestContext?: { [key: string]: string | string[] }
  policyValues: string[]
  testValue: string
  expected: boolean,
  explains?: {
    value: string
    matches: boolean
    resolvedValue?: string
    errors?: string[]
  }[]
}

export function testOperator(name: string, tests: BaseOperatorTest[], operator: BaseConditionOperator) {
  describe(name, it => {
    for(const test of tests) {
      it(test.name, () => {
        //Given the request
        const request = new AwsRequestImpl('', {resource: '', accountId: ''}, '', new RequestContextImpl(test.requestContext || {}))
        //When the condition is evaluated
        const result = operator.matches(request, test.testValue, test.policyValues)

        if(typeof result === 'object') {
          //Then the result should be as expected
          expect(result.matches).toBe(test.expected)
          if(test.explains) {
            for(const explain of test.explains) {
              const found = result.explains.find(e => e.value === explain.value)
              expect(found, `Missing explain for ${explain.value}`).toBeDefined()
              expect(found?.matches, `${explain.value} match`).toBe(explain.matches)
              if(explain.resolvedValue) {
                expect(found?.resolvedValue, `${explain.value} resolved value`).toBe(explain.resolvedValue)
              } else {
                expect(found?.resolvedValue, `${explain.value} resolved value to be undefined`).toBeUndefined()
              }
              if(explain.errors) {
                expect(found?.errors, `${explain.value} errors`).toEqual(explain.errors.sort())
              }
            }
          }
        } else {
          //Then the result should be as expected
          expect(result).toBe(test.expected)
        }


      })
    }
  })
}