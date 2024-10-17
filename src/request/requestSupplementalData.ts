
/**
 * Supplemental data for the request
 */
export interface RequestSupplementalData {
  contextKeysForAction: string[];
  contextKeysForResource: string[];
  contextKeysForPrincipal: string[];
  contextKeyValidForRequest: (key: string) => boolean;
}

export class RequestSupplementalDataImpl implements RequestSupplementalData {

  private allActions: Set<string> = new Set();

  constructor(public readonly contextKeysForAction: string[],
              public readonly contextKeysForResource: string[],
              public readonly contextKeysForPrincipal: string[]) {
    for(const action of contextKeysForAction) {
      this.allActions.add(action)
    }
    for(const resource of contextKeysForResource) {
      this.allActions.add(resource)
    }
    for(const principal of contextKeysForPrincipal) {
      this.allActions.add(...[principal])
    }
  }

  contextKeyValidForRequest(key: string): boolean {
    /*
    Todo: Add a way to check if the key has a slash in it such as aws:RequestKeys or aws:ResourceTagKeys
    */
    return this.allActions.has(key)
  }
}

export const MockRequestSupplementalData: RequestSupplementalData = {
  contextKeysForAction: [],
  contextKeysForResource: [],
  contextKeysForPrincipal: [],
  contextKeyValidForRequest: (key: string) => true
}