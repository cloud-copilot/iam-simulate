import { ContextKey, RequestContext } from "../requestContext.js";
import { RequestAction, RequestActionImpl } from "./requestAction.js";
import { RequestPrincipal, RequestPrincipalImpl } from "./requestPrincipal.js";
import { RequestResource, ResourceRequestImpl } from "./requestResource.js";
import { RequestSupplementalData } from "./requestSupplementalData.js";

/**
 * A request to be evaluated by the policy engine
 */
export interface Request {
  principal: RequestPrincipal;

  /**
   * The action to be performed
   */
  action: RequestAction;

  /**
   * The resource to be acted upon
   */
  resource?: RequestResource;

  /**
   * The context of the request
   */
  context: RequestContext

  /**
   * Checks to see if a context key is valid for the request and
   * exists in the context
   *
   * @param key the key to check for existence
   * @returns true if the key is valid for the request and exists in the request context.
   */
  contextKeyExists(key: string): boolean;

  /**
   * Gets the value of a context key, if it is valid for the request and exist, otherwise throws an error
   * @param key the key to get the value of
   *
   * @returns the value of the context key
   */
  getContextKeyValue(key: string): ContextKey;
}

export class RequestImpl implements Request {

  constructor(public readonly principalString: string,
              public readonly resourceString: string | undefined,
              public readonly actionString: string,
              public readonly context: RequestContext,
              public readonly supplementalData: RequestSupplementalData) {

  }

  get action(): RequestAction {
    return new RequestActionImpl(this.actionString);
  }

  get resource(): RequestResource {
    if(this.resourceString === undefined) {
      throw new Error('Resource is undefined')
    }
    return new ResourceRequestImpl(this.resourceString);
  }

  get principal(): RequestPrincipal {
    return new RequestPrincipalImpl(this.principalString);
  }


  public contextKeyExists(key: string): boolean {
    return this.supplementalData.contextKeyValidForRequest(key) && this.context.contextKeyExists(key);
  }


  public getContextKeyValue(key: string): ContextKey {
    if(!this.contextKeyExists(key)) {
      throw new Error(`Invalid context key: ${key}`)
    }
    return this.context.contextKeyValue(key);
  }
}