import {
  ConditionKey,
  getGlobalConditionKeyByName,
  getGlobalConditionKeyByPrefix
} from '@cloud-copilot/iam-data'

export function getGlobalConditionKeyWithOrWithoutPrefix(key: string): ConditionKey | undefined {
  const slashIndex = key.indexOf('/')
  if (slashIndex !== -1) {
    return getGlobalConditionKeyByPrefix(key.slice(0, slashIndex))
  }
  return getGlobalConditionKeyByName(key)
}
