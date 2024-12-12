import { loadPolicy } from '@cloud-copilot/iam-policy';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from "vitest";
import { AwsRequestImpl } from '../request/request.js';
import { RequestContextImpl } from '../requestContext.js';
import { AuthorizationRequest, authorize } from './coreSimulatorEngine.js';

function getAllFiles(dir: string, allFiles: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      // Recursively read directory
      getAllFiles(filePath, allFiles);
    } else {
      // Add file to the list
      allFiles.push(filePath);
    }
  });

  return allFiles;
};

describe('coreSimulatorEngine', () => {
  const testFolderPath = resolve(join(__dirname, 'coreEngineTests'))
  const allFiles = getAllFiles(testFolderPath);
  const pickTest: string | undefined = undefined

  for(const testFile of allFiles) {
    const relativePath = testFile.replace(testFolderPath, '').slice(1);
    describe(relativePath, () => {
      const content = readFileSync(testFile, 'utf-8');
      const testCases = JSON.parse(content);
      for(const testCase of testCases) {
        let testFunc: typeof it | typeof it.only | typeof it.skip = it
        if(pickTest === testCase.name) {
          testFunc = it.only
        } else if (testCase.skip) {
          testFunc = it.skip
        }
        testFunc(testCase.name, () => {

          //Given the request
          const {principal, resource, action, context} = testCase.request;
          const request = new AwsRequestImpl(principal, resource, action, new RequestContextImpl(context));
          // And Policies
          const identityPolicies = testCase.identityPolicies.map((p: any) => loadPolicy(p));
          const serviceControlPolicies = (testCase.serviceControlPolicies || []).map((scp: any) => {
            return {
              orgIdentifier: scp.orgIdentifier,
              policies: scp.policies.map((p: any) => loadPolicy(p))
            }
          })
          const resourcePolicy = testCase.resourcePolicy ? loadPolicy(testCase.resourcePolicy) : undefined;
          //In an authorization request
          const authorizationRequest: AuthorizationRequest = {
            request,
            identityPolicies,
            serviceControlPolicies,
            resourcePolicy
          };

          // When the request is authorized
          const analysis = authorize(authorizationRequest);

          // Then the result should match the expected result
          const expected = testCase.expected.response
          expect(analysis.result).toEqual(expected);
        });
      }
    })
  }
})