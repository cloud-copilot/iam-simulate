import { describe, expect } from "vitest"
import { AwsRequestImpl } from "../request/request.js"
import { MockRequestSupplementalData } from "../request/requestSupplementalData.js"
import { RequestContextImpl } from "../requestContext.js"
import { BaseConditionOperator } from "./BaseConditionOperator.js"

export interface BaseOperatorTest {
  name: string
  requestContext: { [key: string]: string }
  policyValues: string[]
  testValue: string
  expected: boolean
}

export function testOperator(name: string, tests: BaseOperatorTest[], operator: BaseConditionOperator) {
  describe(name, it => {
    for(const test of tests) {
      it(test.name, () => {
        //Given the request
        const request = new AwsRequestImpl('', '', '', new RequestContextImpl(test.requestContext), MockRequestSupplementalData)
        //When the condition is evaluated
        const result = operator.matches(request, test.testValue, test.policyValues)

        //Then the result should be as expected
        expect(result).toBe(test.expected)
      })
    }
  })
}