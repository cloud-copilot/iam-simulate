import { StatementExplain } from "./statementExplain.js";

const explain1: StatementExplain = {
  // request: {
  //   action: 's3:GetObject',
  //   principal: 'arn:aws:iam::123456789012:user/Bob',
  //   resource: 'arn:aws:s3:::examplebucket/123.txt',
  //   context: {
  //     'aws:SecureTransport': 'true',
  //     's3:ExistingObjectTag/Department': 'Engineering',
  //     'aws:PrincipalTag/Department': 'Engineering'
  //   }
  // },

  identifier: 'Statement1',
  matches: true,

  effect: 'Allow',
  actions: [
    {
      action: 's3:Get*',
      matches: true
    },
    {
      action: 's3:PutObject',
      matches: false
    }
  ],

  resources: [
    {
      resource: 'arn:aws:s3:::examplebucket/*',
      errors: [],
      matches: true
    },
    {
      resource: 'arn:aws:s3:::examplebucket/${aws:PrincipalTag/Department}/*',
      resolvedValue: 'arn:aws:s3:::examplebucket/Engineering/*',
      errors: [],
      matches: true
    },
    {
      resource: 'arn:aws:s3:::examplebucket/abc/*',
      errors: [],
      matches: false
    }
  ],



  conditions: [
    {
      conditionKeyValue: 'aws:SecureTransport',
      resolvedConditionKeyValue: 'true',
      operator: 'Bool',
      matches: true,
      values:{
          value: 'true',
          resolvedValue: 'true',
          matches: true,
          errors: []
      },
    }, {
      conditionKeyValue: 's3:PrincipalTag/Department',
      resolvedConditionKeyValue: 'Engineering',
      operator: 'StringEquals',
      matches: true,
      values: [
        {
          value: 'Engineering',
          resolvedValue: 'Engineering',
          matches: true,
          errors: []
        },
        {
          value: 'Quality',
          resolvedValue: 'Engineering',
          matches: false,
          errors: []
        }
      ]
    }
  ]
}

function buffers(n: number): string {
  return '  '.repeat(n)
}

export function printExplain(explain: StatementExplain) {
  const buffer = '  '

  console.log(`{`)

  if(explain.matches) {
    console.log(`${buffer}// Statement ${explain.identifier} Matches`)
  } else {
    console.log(`${buffer}// Statement ${explain.identifier} Does NOT Match`)
  }

  if(explain.actions && !Array.isArray(explain.actions)) {
    const actionString = `${buffer}"Action": "${explain.actions.action}", // ${explain.actions.matches ? 'Match' : 'No Match'}`
  } else if(explain.actions && Array.isArray(explain.actions)) {
    console.log(`${buffer}"Action": [`)
    for(const action of explain.actions) {
      console.log(`${buffers(2)}"${action.action}", // ${action.matches ? 'Match' : 'No Match'}`)
    }
    console.log(`${buffer}]`);
  }

  if(explain.resources && !Array.isArray(explain.resources)) {
    if(explain.resources.resolvedValue) {
      console.log(`${buffer}        //${explain.resources.resolvedValue} // Resolved Value`)
    }
    console.log(`${buffer}"Resource": "${explain.resources.resource}", // ${explain.resources.matches ? 'Match' : 'No Match'}`)
  } else if(explain.resources && Array.isArray(explain.resources)) {
    console.log(`${buffer}"Resource": [`)
    for(const resource of explain.resources) {
      let resourceLine = `${buffers(2)}"${resource.resource}", // ${resource.matches ? 'Match' : 'No Match'}`
      if(resource.resolvedValue) {
        resourceLine += ` Resolved to "${resource.resolvedValue}"`
      }
      console.log(resourceLine)
    }
    console.log(`${buffer}]`);
  }

  if(explain.conditions) {
    const operators = explain.conditions.map(c => c.operator)
    console.log(`${buffer}"Condition": {`)
    for(const op of operators) {
      const opConditions = explain.conditions.filter(c => c.operator === op)
      console.log(`${buffers(2)}"${op}": {`)
      for(const c of opConditions)  {
        if(c.values && !Array.isArray(c.values)) {
          console.log(`${buffers(3)}"${c.conditionKeyValue}": "${c.values.value}", // ${c.matches ? 'Match' : 'No Match'}`)
          // console.log(`${buffers(3)}"Value": "${c.values.value}", // ${c.values.matches ? 'Match' : 'No Match'}`)
        } else if(c.values && Array.isArray(c.values)) {
          console.log(`${buffers(3)}"${c.conditionKeyValue}": [`)
          for(const v of c.values) {
            console.log(`${buffers(4)}"${v.value}", // ${v.matches ? 'Match' : 'No Match'}`)
          }
          console.log(`${buffers(3)}]`)
        }
      }

      console.log(`${buffers(2)}}`)
    }

    console.log(`${buffer}}`)

  }

  console.log(`}`)


}

printExplain(explain1)