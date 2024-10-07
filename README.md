# Expand IAM Actions
Built in the Unix philosophy, this is a small tool that does one thing well: expand IAM actions with wildcards to their list of matching actions.

Use this to:
1) Expand wildcards when you are not allowed to use them in your policies.
2) Get an exhaustive list of actions that are included in a policy to quickly search it for interesting actions.
3) Investigate where interesting or dubious actions are being used in your policies.

<!-- Image of demo.svg -->
![Demo](assets/demo.svg)

Extended demo [on YouTube](https://www.youtube.com/watch?v=357-uGru7300).

Published as an [npm package](#typescriptnodejs-usage) in ESM and CommonJS plus available as a [CLI](#cli).

All information is sourced from [@cloud-copilot/iam-data](https://github.com/cloud-copilot/iam-data) which is updated daily.

## Only Valid Values
`iam-expand` intends to only return valid, actual actions, if any invalid values are passed in such as an invalid format or a service/action that does not exist, they will be left out of the output. There are options to override this behavior.

## Use In Browser
[http://iam.cloudcopilot.io/tools/iam-expand](http://iam.cloudcopilot.io/tools/iam-expand)

## CLI
There is a CLI! The [examples folder](examples/README.md) has examples showing how to use the CLI to find interesting actions in your IAM policies.

### Global CLI Installation
You can install it globally. This also works in the default AWS CloudShell!
```bash
npm install -g @cloud-copilot/iam-expand
```
*Depending on your configuration sudo may be required to install globally.*

### Install CLI In a Project
You can also install the CLI in a project and run it with `npx`.
```bash
npm install @cloud-copilot/iam-expand
# Run with npx inside your project
npx @cloud-copilot/iam-expand
```

### Expand Actions
The simplest usage is to pass in the actions you want to expand.
```bash
iam-expand s3:Get*Tagging
# Outputs all Get*Tagging actions
s3:GetBucketTagging
s3:GetJobTagging
s3:GetObjectTagging
s3:GetObjectVersionTagging
s3:GetStorageLensConfigurationTaggin
```

```bash
iam-expand s3:Get*Tagging s3:Put*Tagging
# Outputs the combination of Get*Tagging and Put*Tagging actions deduplicated and sorted
s3:GetBucketTagging
s3:GetJobTagging
s3:GetObjectTagging
s3:GetObjectVersionTagging
s3:GetStorageLensConfigurationTagging
s3:PutBucketTagging
s3:PutJobTagging
s3:PutObjectTagging
s3:PutObjectVersionTagging
s3:PutStorageLensConfigurationTaggin
```

### Help
Run the command with no options to show usage:
```bash
iam-expand
```

### Options

#### `--expand-asterisk`
By default, a single `*` will not be expanded. If you want to expand a single `*` you can set this flag.
```bash
iam-expand "*"
# Returns the asterisk
*

iam-expand --expand-asterisk "*"
# Returns very many strings, very very fast. 📚 🚀
```

#### `--expand-service-asterisk`
By default, a service name followed by a `*` (such as `s3:*` or `lambda:*`) will not be expanded. If you want to expand these you can set this flag.
```bash
iam-expand "s3:*"
# Returns the service:* action
s3:*

iam-expand --expand-service-asterisk "s3:*"
# Returns all the s3 actions in order. 🪣
s3:AbortMultipartUpload
s3:AssociateAccessGrantsIdentityCenter
s3:BypassGovernanceRetention
...
```

#### `--error-on-invalid-format`
By default, if an invalid format is passed in, such as:
*  `s3Get*Tagging` (missing a separator) or
*  `s3:Get:Tagging*` (too many separators)

it will be silenty ignored and left out of the output. If you want to throw an error when an invalid format is passed in you can set this flag.

```bash
iam-expand "s3Get*Tagging"
# Returns nothing

iam-expand --error-on-invalid-format "s3Get*Tagging"
# Throws an error and returns a non zero exit code
# Invalid action format: s3Get*Tagging
```

#### `--error-on-invalid-service`
By default, if a service is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. If you want to throw an error when a service is passed in that does not exist you can set this flag.

```bash
iam-expand "r2:Get*Tagging"
# Returns nothing

iam-expand --error-on-invalid-service "r2:Get*Tagging"
# Throws an error and returns a non zero exit code
# Service not found: r2
```

#### `--invalid-action-behavior`
By default, if an action is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. There are two options to override this behavior: `error` and `include`.

```bash
iam-expand "ec2:DestroyAvailabilityZone"
# Returns nothing

iam-expand --invalid-action-behavior=remove "ec2:DestroyAvailabilityZone"
# Returns nothing

iam-expand --invalid-action-behavior=error "ec2:DestroyAvailabilityZone"
# Throws an error and returns a non zero exit code
# Invalid action: ec2:DestroyAvailabilityZone

iam-expand --invalid-action-behavior=include "ec2:DestroyAvailabilityZone"
# Returns the invalid action
ec2:DestroyAvailabilityZone
```

#### `--show-data-version`
Show the version of the data that is being used to expand the actions and exit.

```bash
iam-expand --show-data-version
@cloud-copilot/iam-data version: 0.3.202409051
Data last updated: Thu Sep 05 2024 04:46:39 GMT+0000 (Coordinated Universal Time)
Update with either:
  npm update @cloud-copilot/iam-data
  npm update -g @cloud-copilot/iam-data
```

#### `--read-wait-ms`
When reading from stdin (see [below](#read-from-stdin)) the CLI will wait 10 seconds for the first byte to be read before timing out. This is enough time for most operations. If you want to wait longer you can set this flag to the number of milliseconds you want to wait.

```bash
cat policy.json | iam-expand
# Will wait up to 10 seconds for input to start, which is plenty of time for a local file.

curl "https://government-secrets.s3.amazonaws.com/secret-policy.json" | iam-expand --read-wait-ms=20_000
# Will wait up to 20 seconds to receive first byte from curl before timing out. Adjust as needed
```

### Read from stdin
If no actions are passed as arguments, the CLI will read from stdin.

#### Expanding JSON input
If the input is a valid json document, the CLI will find every instance of `Action` and `NotAction` that is a string or an array of strings and expand them. This is useful for finding all the actions in a policy document or set of documents.

Given `policy.json`
```json

 {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:Get*Tagging",
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "NotAction": ["s3:Get*Tagging", "s3:Put*Tagging"],
      "Resource": "*"
    }
  ]
 }
```

```bash
cat policy.json | iam-expand > expanded-policy.json
```

Gives this file in `expanded-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      // Was "s3:Get*Tagging"
      "Action": [
        "s3:GetBucketTagging",
        "s3:GetJobTagging",
        "s3:GetObjectTagging",
        "s3:GetObjectVersionTagging",
        "s3:GetStorageLensConfigurationTagging"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      // Was ["s3:Get*Tagging", "s3:Put*Tagging"]
      "NotAction": [
        "s3:GetBucketTagging",
        "s3:GetJobTagging",
        "s3:GetObjectTagging",
        "s3:GetObjectVersionTagging",
        "s3:GetStorageLensConfigurationTagging",
        "s3:PutBucketTagging",
        "s3:PutJobTagging",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging",
        "s3:PutStorageLensConfigurationTagging"
      ],
      "Resource": "*"
    }
  ]
 }
```

You can also use this to expand the actions from the output of commands.
```bash
aws iam get-account-authorization-details --output json | iam-expand --expand-service-asterisk --read-wait-ms=20_000 > expanded-authorization-details.json
# Now you can search the output for actions you are interested in
grep -n "kms:DisableKey" expanded-authorization-details.json
```

#### Expanding arbitrary input
If the input from stdin is not json, the content is searched for IAM actions then expands them. Throw anything at it and it will find all the actions it can and expand them.

You can echo content:
```bash
echo "s3:Get*Tagging" | iam-expand
```

You can pull out part of a json file and pipe it in:
```bash
cat policy.json | jq '.Statement[].Action' | iam-expand
```

Or some Terraform:
```bash
cat main.tf | iam-expand
```

Or some CloudFormation:
```bash
cat template.yaml | iam-expand
```

Or even some HTML:
```bash
curl "https://docs.aws.amazon.com/aws-managed-policy/latest/reference/ReadOnlyAccess.html" | iam-expand
```

Or the output of any command.

Because of the likelyhood of finding an aseterik `*` in the input; if the value to stdin is not a valid json document the stdin option will not find or expand a single `*` even if `--expand-asterisk` is passed.

Please give this anything you can think of and open an issue if you see an opportunity for improvement.

## Typescript/NodeJS Usage

## Add to a project
```bash
npm install @cloud-copilot/iam-expand
```

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

expandIamActions('s3:Get*Tagging')
[
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging'
]

expandIamActions(['s3:Get*Tagging', 's3:Put*Tagging'])
[
  's3:GetBucketTagging',
  's3:GetJobTagging',
  's3:GetObjectTagging',
  's3:GetObjectVersionTagging',
  's3:GetStorageLensConfigurationTagging',
  's3:PutBucketTagging',
  's3:PutJobTagging',
  's3:PutObjectTagging',
  's3:PutObjectVersionTagging',
  's3:PutStorageLensConfigurationTagging'
]
```

## API
`expandIamActions(actionStringOrStrings: string | string[], overrideOptions?: Partial<ExpandIamActionsOptions>)` is the main function that will expand the actions of the IAM policy. Takes a string or array of strings and returns an array of strings that the input matches.

## Only Valid Values
`expandIamActions` intends to only return valid actual actions, if any invalid values are passed in such as an invalid format or a service/action that does not exist, they will be left out of the output. There are options to override this behavior.

## Options
`expandIamActions` an optional second argument that is an object with the following options:

### `expandAsterisk`
By default, a single `*` will not be expanded. If you want to expand a single `*` you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Returns the unexpanded value
expandIamActions('*')
['*']

//Returns the expanded value
expandIamActions('*', { expandAsterisk: true })
[
  //Many many strings. 🫢
]
```
### `expandServiceAsterisk`
By default, a service name followed by a `*` (such as `s3:*` or `lambda:*`) will not be expanded. If you want to expand these you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Returns the unexpanded value
expandIamActions('s3:*')
['s3:*']

//Returns the expanded value
expandIamActions('s3:*', { expandServiceAsterisk: true })
[
  //All the s3 actions. 🫢
]
```

### `errorOnInvalidFormat`
By default, if an invalid format is passed in, such as:
*  `s3Get*Tagging` (missing a separator) or
*  `s3:Get:Tagging*` (too many separators)

it will be silenty ignored and left out of the output. If you want to throw an error when an invalid format is passed in you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Ignore invalid format
expandIamActions('s3Get*Tagging')
[]

//Throw an error on invalid format
expandIamActions('s3Get*Tagging', { errorOnInvalidFormat: true })
//Uncaught Error: Invalid action format: s3Get*Tagging
```

### `errorOnInvalidService`
By default, if a service is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. If you want to throw an error when a service is passed in that does not exist you can set this option to `true`.

```typescript
import { expandIamActions } from '@cloud-copilot/iam-expand';

//Ignore invalid service
expandIamActions('r2:Get*Tagging')
[]

//Throw an error on invalid service
expandIamActions('r2:Get*Tagging', { errorOnInvalidService: true })
//Uncaught Error: Service not found: r2
```

## `invalidActionBehavior`
By default, if an action is passed in that does not exist in the IAM data, it will be silently ignored and left out of the output. There are two options to override this behavior: `Error` and `Include`.

```typescript
import { expandIamActions, InvalidActionBehavior } from '@cloud-copilot/iam-expand';

//Ignore invalid action by default
expandIamActions('ec2:DestroyAvailabilityZone')
[]

//Ignore invalid action explicitly
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Remove })
[]

//Throw an error on invalid action
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Error })
//Uncaught Error: Invalid action: ec2:DestroyAvailabilityZone

//Include invalid action
expandIamActions('ec2:DestroyAvailabilityZone', { invalidActionBehavior: InvalidActionBehavior.Include })
['ec2:DestroyAvailabilityZone']
```


