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
})

describe("typeForContextKey", () => {
  it('should return a service key with a slash in it', async () => {
    //Given a service key
    const key = 's3:ExistingObjectTag/Classification'

    //When the type is gotten
    const result = await typeForContextKey(key)

    //Then the result should be returned
    expect(result).toEqual('String')
  })
})