import { describe, expect, it } from 'vitest'
import { AwsRequest, AwsRequestImpl } from './request/request.js'
import { RequestContextImpl } from './requestContext.js'
import { convertIamStringToRegex } from './util.js'

function testRequestWithContext(context: any, validContextVariables?: string[]): AwsRequest {
  validContextVariables = validContextVariables || []
  //For now we assume that all values passed into the context are valid
  return new AwsRequestImpl('', '', '', new RequestContextImpl(context))
}

describe('convertIamStringToRegex', () => {
  it('should replace ${$} with a dollar sign', () => {
    //Given a string with a ${$} variable
    const value = 'arn:aws:s3:::${$}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\\$$')
    expect(result.exec('arn:aws:s3:::$')).toBeTruthy()
  })

  it('should replace ${?} with a question mark', () => {
    //Given a string with a ${?} variable
    const value = 'arn:aws:s3:::${?}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\\?$')
    // expect(result.exec('arn:aws:s3:::?')).toBeTruthy()
  })

  it('should replace ${*} with a star', () => {
    //Given a string with a ${*} variable
    const value = 'arn:aws:s3:::${*}'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\\*$')
    expect(result.exec('arn:aws:s3:::*')).toBeTruthy()
  })

  it('should replace ? with a dot', () => {
    //Given a string with a ? variable
    const value = 'arn:aws:s3:::?'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::.$')
    expect(result.exec('arn:aws:s3:::a')).toBeTruthy()
  })

  it('should replace * with a non greedy period', () => {
    //Given a string with a * variable
    const value = 'arn:aws:s3:::*'
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::.*?$')
    expect(result.exec('arn:aws:s3:::abcdefg')).toBeTruthy()
  })

  describe('variables', () => {
    it('should replace a variable with its value if it exists', () => {
      //Given a string with a variable
      const value = 'arn:aws:s3:::${aws:PrincipalAccountId}'
      //And a request
      const request = testRequestWithContext({
        'aws:PrincipalAccountId': '123456789012'
      }, ['aws:PrincipalAccountId'])

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
    })

    it('should replace a variable with its default value if it does not exist, and a default is set', () => {
      //Given a string with a variable witha  default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '123456789012'}"
      //And a request without that variable
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
      expect(result.exec('arn:aws:s3:::123456789012')).toBeTruthy()
    })

    it('should replace a variable with its value if the default is set and a value exists', () => {
      //Given a string with a variable with a default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '987654321'}"
      //And a request with that variable
      const request = testRequestWithContext({
        'aws:PrincipalAccountId': '123456789012'
      }, ['aws:PrincipalAccountId'])

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
      expect(result.exec('arn:aws:s3:::123456789012')).toBeTruthy()
    })

    it('should return a pattern that will not match any value if a request value does not exist and no defalt is set', () => {
      //Given a string with a variable
      const value = "arn:aws:s3:::${aws:PrincipalAccountId}"
      //And a request with that variable
      const request = testRequestWithContext({})

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('a^')
      expect(result.exec('arn:aws:s3:::--undefined---')).toBeFalsy()
    })

    it('should not match any value if a variable is a multi value variable', () => {
      //Given a string with a variable
      const value = "arn:aws:s3:::${aws:PrincipalOrgPaths}"
      //And a request with that variable
      const request = testRequestWithContext({
        'aws:PrincipalOrgPaths': ['123456789012', '987654321']
      }, ['aws:PrincipalOrgPaths'])

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('a^')
      expect(result.exec('arn:aws:s3:::--undefined---')).toBeFalsy()
    })

    it('should replace variables names with slashes in them', () => {
      //Given a string with a variable with a slash in the name
      const value = "arn:aws:s3:::bucket/${aws:PrincipalTag/Foo}"
      //And a request with that variable
      const request = testRequestWithContext({
        'aws:PrincipalTag/Foo': 'Bar'
      }, ['aws:PrincipalTag/Foo'])

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, request)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::bucket\\\/Bar$')
      expect(result.exec('arn:aws:s3:::bucket/Bar')).toBeTruthy()
    })
  })

  it('should not replace wildcards if the option is set to false', () => {
    //Given a string with a wildcard
    const value = "arn:aws:s3:::*"
    //And a request
    const request = testRequestWithContext({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request, {replaceWildcards: false})

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\\*$')
    expect(result.exec('arn:aws:s3:::*')).toBeTruthy()
  })

  it('should replace forward slashes with escaped forward slashes', () => {
    //Given an arn with a forward slash
    const value = 'arn:aws:iam::123456789012:user/${aws:username}'

    //And a request
    const request = testRequestWithContext({
      'aws:username': 'Bob'
    }, ['aws:username'])

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:iam::123456789012:user\\/Bob$')
    expect(result.exec('arn:aws:iam::123456789012:user/Bob')).toBeTruthy()
  })

  it('should escpace special characters in variable values', () => {
    //Given a string with a variable
    const value = 'arn:aws:iam::123456789012:user/${aws:username}'
    //And a request
    const request = testRequestWithContext({
      'aws:username': 'Bob*'
    }, ['aws:username'])

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, request)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:iam::123456789012:user\\/Bob\\*$')
    expect(result.exec('arn:aws:iam::123456789012:user/Bob*')).toBeTruthy()
    expect(result.exec('arn:aws:iam::123456789012:user/Bob')).toBeFalsy()
  })
})