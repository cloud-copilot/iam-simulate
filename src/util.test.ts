import { describe, expect, it } from 'vitest'
import { AwsRequest, AwsRequestImpl } from './request/request.js'
import { RequestContextImpl } from './requestContext.js'
import { convertIamString, getVariablesFromString, isS3BucketOrObjectArn } from './util.js'

function testRequestWithContext(context: any, validContextVariables?: string[]): AwsRequest {
  validContextVariables = validContextVariables || []
  //For now we assume that all values passed into the context are valid
  return new AwsRequestImpl(
    '',
    { accountId: '', resource: '' },
    '',
    new RequestContextImpl(context)
  )
}

describe('convertIamString', () => {
  it('should replace ${$} with a dollar sign', () => {
    //Given a string with a ${$} variable
    const value = 'arn:aws:s3:::${$}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::\\$$')
    expect(result.pattern.exec('arn:aws:s3:::$')).toBeTruthy()
  })

  it('should replace ${?} with a question mark', () => {
    //Given a string with a ${?} variable
    const value = 'arn:aws:s3:::${?}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::\\?$')
    // expect(result.pattern.exec('arn:aws:s3:::?')).toBeTruthy()
  })

  it('should replace ${*} with a star', () => {
    //Given a string with a ${*} variable
    const value = 'arn:aws:s3:::${*}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::\\*$')
    expect(result.pattern.exec('arn:aws:s3:::*')).toBeTruthy()
  })

  it('should replace ? with a dot', () => {
    //Given a string with a ? variable
    const value = 'arn:aws:s3:::?'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::.$')
    expect(result.pattern.exec('arn:aws:s3:::a')).toBeTruthy()
  })

  it('should replace * with a non greedy period', () => {
    //Given a string with a * variable
    const value = 'arn:aws:s3:::*'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::.*?$')
    expect(result.pattern.exec('arn:aws:s3:::abcdefg')).toBeTruthy()
  })

  describe('variables', () => {
    it('should replace a variable with its value if it exists', () => {
      //Given a string with a variable
      const value = 'arn:aws:s3:::${aws:PrincipalAccountId}'
      //And a request
      const request = testRequestWithContext(
        {
          'aws:PrincipalAccountId': '123456789012'
        },
        ['aws:PrincipalAccountId']
      )

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('^arn:aws:s3:::123456789012$')
    })

    it('should replace a variable with its default value if it does not exist, and a default is set', () => {
      //Given a string with a variable witha  default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '123456789012'}"
      //And a request without that variable
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('^arn:aws:s3:::123456789012$')
      expect(result.pattern.exec('arn:aws:s3:::123456789012')).toBeTruthy()
    })

    it('should replace a variable with its value if the default is set and a value exists', () => {
      //Given a string with a variable with a default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '987654321'}"
      //And a request with that variable
      const request = testRequestWithContext(
        {
          'aws:PrincipalAccountId': '123456789012'
        },
        ['aws:PrincipalAccountId']
      )

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('^arn:aws:s3:::123456789012$')
      expect(result.pattern.exec('arn:aws:s3:::123456789012')).toBeTruthy()
    })

    it('should return a pattern that will not match any value if a request value does not exist and no defalt is set', () => {
      //Given a string with a variable
      const value = 'arn:aws:s3:::${aws:PrincipalAccountId}'
      //And a request with that variable
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('a^')
      expect(result.pattern.exec('arn:aws:s3:::--undefined---')).toBeFalsy()
      expect(result.errors).toEqual([
        '{aws:PrincipalAccountId} not found in request context, and no default value provided. This will never match'
      ])
    })

    it('should not match any value if a variable is a multi value variable', () => {
      //Given a string with a variable
      const value = 'arn:aws:s3:::${aws:PrincipalOrgPaths}'
      //And a request with that variable
      const request = testRequestWithContext({
        'aws:PrincipalOrgPaths': ['123456789012', '987654321']
      })

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('a^')
      expect(result.pattern.exec('arn:aws:s3:::--undefined---')).toBeFalsy()
      expect(result.errors).toEqual([
        '{aws:PrincipalOrgPaths} is a multi value context key, and cannot be used for replacement. This will never match'
      ])
    })

    it('should replace variables names with slashes in them', () => {
      //Given a string with a variable with a slash in the name
      const value = 'arn:aws:s3:::bucket/${aws:PrincipalTag/Foo}'
      //And a request with that variable
      const request = testRequestWithContext(
        {
          'aws:PrincipalTag/Foo': 'Bar'
        },
        ['aws:PrincipalTag/Foo']
      )

      //When the string is converted to a regex
      const result = convertIamString(value, request)

      //Then the result should be a regex that matches the string
      expect(result.pattern.source).toBe('^arn:aws:s3:::bucket\\\/Bar$')
      expect(result.pattern.exec('arn:aws:s3:::bucket/Bar')).toBeTruthy()
    })
  })

  it('should not replace wildcards if the option is set to false', () => {
    //Given a string with a wildcard
    const value = 'arn:aws:s3:::*'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamString(value, request, { replaceWildcards: false })

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:s3:::\\*$')
    expect(result.pattern.exec('arn:aws:s3:::*')).toBeTruthy()
  })

  it('should replace forward slashes with escaped forward slashes', () => {
    //Given an arn with a forward slash
    const value = 'arn:aws:iam::123456789012:user/${aws:username}'

    //And a request
    const request = testRequestWithContext(
      {
        'aws:username': 'Bob'
      },
      ['aws:username']
    )

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:iam::123456789012:user\\/Bob$')
    expect(result.pattern.exec('arn:aws:iam::123456789012:user/Bob')).toBeTruthy()
  })

  it('should escpace special characters in variable values', () => {
    //Given a string with a variable
    const value = 'arn:aws:iam::123456789012:user/${aws:username}'
    //And a request
    const request = testRequestWithContext(
      {
        'aws:username': 'Bob*'
      },
      ['aws:username']
    )

    //When the string is converted to a regex
    const result = convertIamString(value, request)

    //Then the result should be a regex that matches the string
    expect(result.pattern.source).toBe('^arn:aws:iam::123456789012:user\\/Bob\\*$')
    expect(result.pattern.exec('arn:aws:iam::123456789012:user/Bob*')).toBeTruthy()
    expect(result.pattern.exec('arn:aws:iam::123456789012:user/Bob')).toBeFalsy()
  })

  describe('convertToRegex - False', () => {
    it('should not make a regular expression if convertToRegex is false', () => {
      //Given a string with a variable
      const value = 'arn:aws:ec2:*:*:instance/${aws:Username}'
      //And a request
      const request = testRequestWithContext({
        'aws:Username': 'Bob'
      })

      //When the string is converted to a regex
      const result = convertIamString(value, request, { convertToRegex: false })

      //Then the result should be a string that matches the string
      expect(result).toBe('arn:aws:ec2:*:*:instance/Bob')
    })

    it('should not escpace special characters in variable values', () => {
      //Given a string with a variable
      const value = 'arn:aws:iam::123456789012:user/${aws:username}'
      //And a request
      const request = testRequestWithContext(
        {
          'aws:username': 'Bob*'
        },
        ['aws:username']
      )

      //When the string is converted to a regex
      const result = convertIamString(value, request, { convertToRegex: false })

      //Then the result should be a string that matches the string
      expect(result).toBe('arn:aws:iam::123456789012:user/Bob*')
    })

    it('should not escape special characters in default values', () => {
      //Given a string with a variable with a default value
      const value = "arn:aws:s3:::${aws:RequestTag/boom, 'Hello*'}"
      //And a request without that variable
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamString(value, request, { convertToRegex: false })

      //Then the result should be a string that matches the string
      expect(result).toBe('arn:aws:s3:::Hello*')
    })

    it('should not replace variables that are missing in the context', () => {
      //Given a string with a variable
      const value = 'arn:aws:iam::123456789012:user/${aws:username}'
      //And a request
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamString(value, request, { convertToRegex: false })

      //Then the result should be a string that matches the string
      expect(result).toBe('arn:aws:iam::123456789012:user/${aws:username}')
    })
  })
})

describe('getVariablesFromString', () => {
  it('should return an empty array if there are no variables', () => {
    //Given a string without any variables
    const value = 'arn:aws:s3:::bucket'

    //When the variables are extracted
    const result = getVariablesFromString(value)

    //Then the result should be an empty array
    expect(result).toEqual([])
  })

  it('should return an array of variables', () => {
    //Given a string with variables
    const value = 'arn:aws:s3:::${aws:username}/${aws:PrincipalAccountId}'

    //When the variables are extracted
    const result = getVariablesFromString(value)

    //Then the result should be an array of variables
    expect(result).toEqual(['aws:username', 'aws:PrincipalAccountId'])
  })

  it('should return an array of variables if there are default values', () => {
    //Given a string with variables
    const value = 'arn:aws:s3:::${aws:username, "Bob"}/${aws:PrincipalAccountId, "123456789012"}'

    //When the variables are extracted
    const result = getVariablesFromString(value)

    //Then the result should be an array of variables
    expect(result).toEqual(['aws:username', 'aws:PrincipalAccountId'])
  })
})

describe('isS3BucketOrObjectArn', () => {
  it('should return true for a valid S3 bucket ARN', () => {
    //Given a valid S3 bucket ARN
    const arn = 'arn:aws:s3:::my-bucket'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be true
    expect(result).toBe(true)
  })

  it('should return true for a valid S3 object ARN', () => {
    //Given a valid S3 object ARN
    const arn = 'arn:aws:s3:::my-bucket/my-object'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be true
    expect(result).toBe(true)
  })

  it('should return true for a valid S3 object ARN with nested path', () => {
    //Given a valid S3 object ARN with nested path
    const arn = 'arn:aws:s3:::my-bucket/folder/subfolder/my-object'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be true
    expect(result).toBe(true)
  })

  it('should return false for an ARN with a different service', () => {
    //Given an ARN for a different service
    const arn = 'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })

  it('should return false for an S3 ARN with a region', () => {
    //Given an S3 ARN with a region
    const arn = 'arn:aws:s3:us-east-1::my-bucket'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })

  it('should return false for an S3 ARN with an account ID', () => {
    //Given an S3 ARN with an account ID
    const arn = 'arn:aws:s3::123456789012:my-bucket'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })

  it('should return false for an S3 ARN with both region and account ID', () => {
    //Given an S3 ARN with both region and account ID
    const arn = 'arn:aws:s3:us-east-1:123456789012:my-bucket'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })

  it('should return false for an S3 ARN without a resource', () => {
    //Given an S3 ARN without a resource
    const arn = 'arn:aws:s3:::'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })

  it('should return false for an S3 access point ARN', () => {
    //Given an S3 access point ARN
    const arn = 'arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point'

    //When checking if it is an S3 bucket or object ARN
    const result = isS3BucketOrObjectArn(arn)

    //Then the result should be false
    expect(result).toBe(false)
  })
})
