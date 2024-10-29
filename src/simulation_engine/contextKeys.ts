import { iamActionDetails, iamResourceTypeDetails, ResourceType } from "@cloud-copilot/iam-data";

export async function allowedContextKeysForRequest(service: string, action: string, resource: string): Promise<string[]> {
  const actionDetails = await iamActionDetails(service, action);
  const actionConditionKeys = actionDetails.conditionKeys;
  if(actionDetails.resourceTypes.length === 0) {
    return actionConditionKeys
  }

  const matchingResourceTypes: ResourceType[] = [];
  for(const rt of actionDetails.resourceTypes) {
    const resourceType = await iamResourceTypeDetails(service, rt.name);
    const pattern = convertPatternToRegex(resourceType.arn);
    const match = resource.match(new RegExp(pattern));
    if(match) {
      matchingResourceTypes.push(resourceType);
    }
  }

  if(matchingResourceTypes.length != 1) {
    const matchNames = matchingResourceTypes.map(rt => rt.key).join(", ");
    throw new Error(`found ${matchingResourceTypes.length} matching resource types for ${resource}: ${matchNames}`);
  }

  console.log(matchingResourceTypes[0].key);

  return [
    ...matchingResourceTypes[0].conditionKeys,
    ...actionConditionKeys
  ]
}

export function convertPatternToRegex(pattern: string): string {
  const regex = pattern.replace(/\$\{.*?\}/g, (match) => {
    const name = match.substring(2, match.length - 1)
    const camelName = name.at(0)?.toLowerCase() + name.substring(1)
    return `(?<${camelName}>(.*?))`
  })
  return `^${regex}$`

  // const parts = pattern.split('/')
  // const lastPart = parts[parts.length - 1]
  // const modifiedParts = parts.map((part) => {
  //   if (part.startsWith('${') && part.endsWith('}')) {
  //     const name = part.substring(2, part.length - 1)
  //     const camelName = name.at(0)?.toLowerCase() + name.substring(1)
  //     if (part === lastPart) {
  //       return `(?<${camelName}>(.*))`
  //     }
  //     return `(?<${camelName}>([^\/]+))`
  //   }
  //   return part
  // })
  // return modifiedParts.join('\/')
}