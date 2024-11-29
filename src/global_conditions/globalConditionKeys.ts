import { ConditionKeyType } from "../context_keys/contextKeyTypes.js";

interface GlobalConditionKey {
  key: string
  category: string
  dataType: ConditionKeyType
}

const globalConditionKeys: GlobalConditionKey[] = [
  {
    key: "aws:PrincipalArn",
    category: "principal",
    dataType: "ARN"
  },
  {
    key: "aws:PrincipalAccount",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:PrincipalOrgPaths",
    category: "principal",
    dataType: "ArrayOfString"
  },
  {
    key: "aws:PrincipalOrgID",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:PrincipalTag/tag-key",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:PrincipalIsAWSService",
    category: "principal",
    dataType: "Bool"
  },
  {
    key: "aws:PrincipalServiceName",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:PrincipalServiceNamesList",
    category: "principal",
    dataType: "ArrayOfString"
  },
  {
    key: "aws:PrincipalType",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:userid",
    category: "principal",
    dataType: "String"
  },
  {
    key: "aws:username",
    category: "principal",
    dataType: "String"
  },

  {
    key: "aws:AssumedRoot",
    category: "session",
    dataType: "String",
  },
  {
    key: "aws:FederatedProvider",
    category: "session",
    dataType: "String",
  },
  {
    key: "aws:TokenIssueTime",
    category: "session",
    dataType: "Date",
  },
  {
    key: "aws:MultiFactorAuthAge",
    category: "session",
    dataType: "Numeric",
  },
  {
    key: "aws:MultiFactorAuthPresent",
    category: "session",
    dataType: "Bool",
  },
  {
    key: "aws:ChatbotSourceArn",
    category: "session",
    dataType: "ARN",
  },
  {
    key: "aws:Ec2InstanceSourceVpc",
    category: "session",
    dataType: "String",
  },
  {
    key: "aws:Ec2InstanceSourcePrivateIPv4",
    category: "session",
    dataType: "IPAddress",
  },
  {
    key: "aws:SourceIdentity",
    category: "session",
    dataType: "String",
  },
  {
    key: "ec2:RoleDelivery",
    category: "session",
    dataType: "Numeric",
  },
  {
    key: "ec2:SourceInstanceArn",
    category: "session",
    dataType: "ARN",
  },
  {
    key: "glue:RoleAssumedBy",
    category: "session",
    dataType: "String",
  },
  {
    key: "glue:CredentialIssuingService",
    category: "session",
    dataType: "String",
  },
  {
    key: "lambda:SourceFunctionArn",
    category: "session",
    dataType: "ARN",
  },
  {
    key: "ssm:SourceInstanceArn",
    category: "session",
    dataType: "ARN",
  },
  {
    key: "identitystore:UserId",
    category: "session",
    dataType: "String",
  },

  {
    key: "aws:SourceIp",
    category: "network",
    dataType: "IPAddress",
  },
  {
    key: "aws:SourceVpc",
    category: "network",
    dataType: "String",
  },
  {
    key: "aws:SourceVpce",
    category: "network",
    dataType: "String",
  },
  {
    key: "aws:VpcSourceIp  ",
    category: "network",
    dataType: "IPAddress",
  },

  {
    key: "aws:ResourceAccount",
    category: "resource",
    dataType: "String",
  },
  {
    key: "aws:ResourceOrgID",
    category: "resource",
    dataType: "String",
  },
  {
    key: "aws:ResourceOrgPaths",
    category: "resource",
    dataType: "ArrayOfString",
  },
  {
    key: "aws:ResourceTag/tag-key",
    category: "resource",
    dataType: "String",
  },

  {
    key: "aws:CalledVia",
    category: "request",
    dataType: "ArrayOfString",
  },
  {
    key: "aws:CalledViaFirst",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:CalledViaLast",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:ViaAWSService",
    category: "request",
    dataType: "Bool",
  },
  {
    key: "aws:CurrentTime",
    category: "request",
    dataType: "Date",
  },
  {
    key: "aws:EpochTime",
    category: "request",
    dataType: "Date", //Can Also be Numeric...
  },
  {
    key: "aws:referer",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:RequestedRegion",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:RequestTag/tag-key",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:TagKeys",
    category: "request",
    dataType: "ArrayOfString",
  },
  {
    key: "aws:SecureTransport",
    category: "request",
    dataType: "Bool",
  },
  {
    key: "aws:SourceArn",
    category: "request",
    dataType: "ARN",
  },
  {
    key: "aws:SourceAccount",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:SourceOwner",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:SourceOrgPaths",
    category: "request",
    dataType: "ArrayOfString",
  },
  {
    key: "aws:SourceOrgID",
    category: "request",
    dataType: "String",
  },
  {
    key: "aws:UserAgent",
    category: "request",
    dataType: "String",
  }
]

const keysByName = globalConditionKeys.reduce((acc, key) => {
  acc[key.key.toLowerCase()] = key;
  return acc;
}, {} as Record<string, GlobalConditionKey>);

const variableKeysByName = globalConditionKeys.reduce((acc, key) => {
  if(key.key.includes("/")) {
    acc[key.key.split("/")[0].toLowerCase()] = key;
  }
  return acc;
}, {} as Record<string, GlobalConditionKey>);

const keysByCategory = globalConditionKeys.reduce((acc, key) => {
  const lowerCategory = key.category.toLowerCase();
  acc[lowerCategory] = acc[lowerCategory] || [];
  acc[lowerCategory].push(key);
  return acc;
}, {} as Record<string, GlobalConditionKey[]>);

export function getGlobalConditionKeyWithOrWithoutPrefix(key: string): GlobalConditionKey | undefined {
  const slashIndex = key.indexOf("/");
  if(slashIndex !== -1) {
    return getVariableGlobalConditionKeyByPrefix(key.slice(0, slashIndex));
  }
  return getGlobalConditionKey(key)
}

export function getGlobalConditionKey(key: string): GlobalConditionKey | undefined {
  return keysByName[key.toLowerCase()];
}

export function globalConditionKeyExists(key: string): boolean {
  return !!getGlobalConditionKey(key);
}

export function getGlobalConditionKeysByCategory(category: string): GlobalConditionKey[] {
  return keysByCategory[category.toLowerCase()] || [];
}

/**
 * Get the details for a global condition key that has a variable by it's prefix
 * for example, it will find aws:ResourceTag/tag-key if you pass in aws:ResourceTag
 *
 * @param prefix - The prefix of the global condition key, case insensitive
 * @returns The global condition key details if found
 */
export function getVariableGlobalConditionKeyByPrefix(prefix: string): GlobalConditionKey | undefined {
  return variableKeysByName[prefix.toLowerCase()];
}

/**
 * Get all the global condition keys as lower case strings
 *
 * @returns a list of all the global condition keys
 */
export function allGlobalConditionKeys(): string[] {
  return Object.keys(keysByName);
}