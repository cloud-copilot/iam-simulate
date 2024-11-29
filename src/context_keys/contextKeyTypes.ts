export type BaseConditionKeyType = 'String' | 'ARN' | 'Numeric' | 'Bool' | 'Date' | 'IPAddress' | 'Binary'
export type ArrayConditionKeyType = `ArrayOf${BaseConditionKeyType}`
export type ConditionKeyType = BaseConditionKeyType | ArrayConditionKeyType

/**
 * Check if a condition key is an array types
 *
 * @param key the condition key type to check
 * @returns true if the key is an array type, otherwise false
 */
export function isConditionKeyArray(key: ConditionKeyType): key is ArrayConditionKeyType {
  return key.startsWith('ArrayOf')
}

/**
 * Get the BaseConditionKeyType from an ArrayConditionKeyType
 *
 * @param key the ArrayConditionKeyType to get the base type from
 * @returns the base type of the array key
 * @throws if the key is not an array type
 */
export function getBaseConditionKeyType(key: ArrayConditionKeyType): BaseConditionKeyType {
  if(!isConditionKeyArray(key)) {
    throw new Error(`Expected ArrayConditionType, got ${key}`)
  }
  return key.slice(7) as BaseConditionKeyType
}