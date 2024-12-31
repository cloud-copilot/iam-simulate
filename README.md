# IAM Simulate

An AWS IAM Simulator and Policy Tester built as a Node/Typescript library.

The simulator currently supports these features of AWS IAM

### IAM Feature Support

- Identity Policies
- Resource Policies
- Service Control Policies
- Resource Control Policies
- Permission Boundaries
- All [AWS Condition Operators](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)
- Same Account and Cross Account Requests
- Custom trust behavior for IAM Trust Policies and KMS Key Policies

### Request Validation

iam-simulate will automatically validate inputs including

- IAM policies using [iam-policy](https://github.com/cloud-copilot/iam-policy)
- IAM Actions using [iam-data](https://github.com/cloud-copilot/iam-data)
- The resource ARN against allowed resource types for the action
- The context keys allowed for the action/resource and their types.

Currently all [global condition keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html) are allowed for all requests which is not strictly true. More validation will be added in the future.

### Explanation

iam-simulate will detail which statements were decisive in the final decision to allow or deny a request.

It will also return "explains" for each statement that was evaluated, detailing why that statement applied to the request or not.

### Features Coming Soon

- Session Policies
- Validation of Global Condition Keys for each action
- Automatically populating context keys from the request such as `aws:PrincipalServiceName`
- Support for anonymous requests

## Installation

```bash
npm install @cloud-copilot/iam-simulate
```

## Usage

```typescript
import { runSimulation, type Simulation } from '@cloud-copilot/iam-simulate'

const simulation: Simulation = {
  identityPolicies: [
    {
      name: 'userpolicy',
      policy: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject'],
            Resource: ['arn:aws:s3:::mybucket/*']
          }
        ]
      }
    }
  ],
  serviceControlPolicies: [
    {
      orgIdentifier: 'ou-12345',
      policies: [
        {
          name: 'AllowAll',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*'
              }
            ]
          }
        }
      ]
    }
  ],
  resourcePolicy: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::mybucket/*'],
        Principal: 'aws:arn:iam::123456789012:root',
        Condition: {
          StringEquals: {
            'aws:PrincipalOrgID': 'o-123456789012'
          }
        }
      }
    ]
  },
  request: {
    action: 's3:GetObject',
    principal: 'arn:aws:iam::123456789012:user/username',
    resource: {
      accountId: '123456789012',
      resource: 'arn:aws:s3:::mybucket/file.txt'
    },
    contextVariables: {
      'aws:PrincipalOrgID': 'o-123456789012'
    }
  }
}

const result = await runSimulation(simulation, {})
//Check for validation errors:
if (result.errors) {
  console.log(result.errors.message)
  console.log(JSON.stringify(result.errors, null, 2))
}

//The simulation ran successfully
if (result.analysis) {
  console.log(result.analysis.result) // 'Allowed', 'ExplicityDenied', or 'ImplicitlyDenied'

  //Output the identity statements that allowed the request
  const identityAllowExplains =
    result?.analysis?.identityAnalysis?.allowStatements.map((s) => s.explain) || []
  //Show which statements applied and exactly how.
  for (const explain of identityAllowExplains) {
    console.log(explain)
  }
}
```

This would output an explain that shows how the identity statement was evaluated:

```javascript
{
  effect: 'Allow',
  identifier: '1',
  matches: true,
  actionMatch: true,
  principalMatch: 'Match',
  resourceMatch: true,
  conditionMatch: true,
  resources: [
    {
      resource: 'arn:aws:s3:::mybucket/*',
      matches: true,
    }
  ],
  actions: [ { action: 's3:GetObject', matches: true } ],
}
```
