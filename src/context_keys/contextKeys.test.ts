import { describe, expect, it } from 'vitest'
import { isActualContextKey, typeForContextKey } from './contextKeys.js'

describe('isActualContextKey', () => {
  it('should return true for a global context key', async () => {
    //Given a global context key
    const key = 'aws:username'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return true for a service context key', async () => {
    //Given a service context key
    const key = 's3:DataAccessPointArn'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return false if the service does not exist', async () => {
    //Given a context key with a service that does not exist
    const key = 'foo:bar'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be false
    expect(result).toBeFalsy()
  })

  it('should return false if the key does not exist', async () => {
    //Given a context key that does not exist
    const key = 'aws:foo'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be false
    expect(result).toBeFalsy()
  })

  it('should return false if the key does not have the correct format', async () => {
    //Given a context key that does not have the correct format
    const key = 'aws:foo:bar'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be false
    expect(result).toBeFalsy()
  })

  it('should return true for a global key that accepts a variable in the key', async () => {
    //Given a global context key
    const key = 'aws:PrincipalTag/SomeTag'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return false for a global key that accepts a variable in the key but there is nothing after the slash', async () => {
    //Given a global context key missing the variable
    const key = 'aws:PrincipalTag/'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be false
    expect(result).toBeFalsy()
  })

  it('should return true for a global key that accepts a variable and there is a slash in the variable', async () => {
    //Given a global context key
    const key = 'aws:PrincipalTag/SomeTag/SomeTag'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return true for a service key that accepts a variable in the key', async () => {
    //Given a service context key
    const key = 's3:ExistingObjectTag/Classification'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return true for a service key that accepts a variable and there is a slash in the variable', async () => {
    //Given a service context key
    const key = 's3:ExistingObjectTag/Classification/Classification'

    //When the key is checked
    const result = await isActualContextKey(key)

    //Then the result should be true
    expect(result).toBeTruthy()
  })

  it('should return true for a OIDC key', async () => {
    //For a given set of OIDC keys
    //https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html#condition-keys-wif
    const keys = [
      'token.actions.githubusercontent.com:aud',
      'token.actions.githubusercontent.com:sub',
      'token.actions.githubusercontent.com:email',
      'token.actions.githubusercontent.com:oaud',
      'token.actions.githubusercontent.com:sub',
      'ABCD-123_456:sub'
    ]

    //When the keys are checked
    for (const key of keys) {
      const result = await isActualContextKey(key)

      //Then the result should be true
      expect(result, key).toEqual(true)
    }
  })
})

describe('typeForContextKey', () => {
  it('should return a service key with a slash in it', async () => {
    //Given a service key
    const key = 's3:ExistingObjectTag/Classification'

    //When the type is gotten
    const result = await typeForContextKey(key)

    //Then the result should be returned
    expect(result).toEqual('String')
  })
})
