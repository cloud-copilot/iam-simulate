import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { BinaryEquals } from "./BinaryEquals.js";

const stringEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should match exact string',
    policyValues: ["YmFzZUBjbG91ZGNvcGlsb3QuaW8=", "NjRAY2xvdWRjb3BpbG90Lmlv"],
    testValue: 'YmFzZUBjbG91ZGNvcGlsb3QuaW8=',
    expected: true
  },
  {
    name: 'should not match different string',
    policyValues: ["YmFzZUBjbG91ZGNvcGlsb3QuaW8=", "NjRAY2xvdWRjb3BpbG90Lmlv"],
    testValue: 'd3Jvb29vb25n',
    expected: false
  },
]

testOperator('StringEquals', stringEqualsTests, BinaryEquals)