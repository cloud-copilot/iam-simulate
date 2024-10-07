import { describe, expect, it } from 'vitest'
import { RequestContextImpl } from './requestContext.js'
import { convertIamStringToRegex } from './util.js'

describe('convertIamStringToRegex', () => {
  it('should replace ${$} with a dollar sign', () => {
    //Given a string with a ${$} variable
    const value = 'arn:aws:s3:::${$}'
    //And a request context
    const requestContext = new RequestContextImpl({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, requestContext)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\$$')
  })

  it('should replace ${?} with a question mark', () => {
    //Given a string with a ${?} variable
    const value = 'arn:aws:s3:::${?}'
    //And a request context
    const requestContext = new RequestContextImpl({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, requestContext)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\?$')
  })

  it('should replace ${*} with a star', () => {
    //Given a string with a ${*} variable
    const value = 'arn:aws:s3:::${*}'
    //And a request context
    const requestContext = new RequestContextImpl({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, requestContext)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::\*$')
  })

  it('should replace ? with a dot', () => {
    //Given a string with a ? variable
    const value = 'arn:aws:s3:::?'
    //And a request context
    const requestContext = new RequestContextImpl({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, requestContext)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::.$')
  })

  it('should replace * with a non greedy period', () => {
    //Given a string with a * variable
    const value = 'arn:aws:s3:::*'
    //And a request context
    const requestContext = new RequestContextImpl({})

    //When the string is converted to a regex
    const result = convertIamStringToRegex(value, requestContext)

    //Then the result should be a regex that matches the string
    expect(result.source).toBe('^arn:aws:s3:::.*?$')
  })

  describe('variables', () => {
    it('should replace a variable with its value if it exists', () => {
      //Given a string with a variable
      const value = 'arn:aws:s3:::${aws:PrincipalAccountId}'
      //And a request context
      const requestContext = new RequestContextImpl({
        'aws:PrincipalAccountId': '123456789012'
      })

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, requestContext)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
    })

    it('should replace a variable with its default value if it does not exist, and a default is set', () => {
      //Given a string with a variable witha  default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '123456789012'}"
      //And a request context without that variable
      const requestContext = new RequestContextImpl({})

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, requestContext)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
    })

    it('should not replace a variable with its value if the default is set and a value exists', () => {
      //Given a string with a variable with a default
      const value = "arn:aws:s3:::${aws:PrincipalAccountId, '987654321'}"
      //And a request context with that variable
      const requestContext = new RequestContextImpl({
        'aws:PrincipalAccountId': '123456789012'
      })

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, requestContext)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::123456789012$')
    })

    it('should put in undefined if a variable does not exist and no default is set', () => {
      //Given a string with a variable
      const value = "arn:aws:s3:::${aws:PrincipalAccountId}"
      //And a request context without that variable
      const requestContext = new RequestContextImpl({})

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, requestContext)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::--undefined---$')
    })

    it('should replace variables names with slashes in them', () => {
      //Given a string with a variable with a slash in the name
      const value = "arn:aws:s3:::bucket/${aws:PrincipalTag/Foo}"
      //And a request context with that variable
      const requestContext = new RequestContextImpl({
        'aws:PrincipalTag/Foo': 'Bar'
      })

      //When the string is converted to a regex
      const result = convertIamStringToRegex(value, requestContext)

      //Then the result should be a regex that matches the string
      expect(result.source).toBe('^arn:aws:s3:::bucket\/Bar$')
    })
  })
})