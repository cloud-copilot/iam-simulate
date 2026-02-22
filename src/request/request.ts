import { type ContextKey, type RequestContext } from '../requestContext.js'
import { type RequestAction, RequestActionImpl } from './requestAction.js'
import { type RequestPrincipal, RequestPrincipalImpl } from './requestPrincipal.js'
import { type RequestResource, ResourceRequestImpl } from './requestResource.js'

/**
 * A request to be evaluated by the policy engine
 */
export interface AwsRequest {
  principal: RequestPrincipal

  /**
   * The action to be performed
   */
  action: RequestAction

  /**
   * The resource to be acted upon
   */
  resource: RequestResource

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
  contextKeyExists(key: string): boolean

  /**
   * Gets the value of a context key, if it is valid for the request and exist, otherwise throws an error
   * @param key the key to get the value of
   *
   * @returns the value of the context key
   */
  getContextKeyValue(key: string): ContextKey
}

export class AwsRequestImpl implements AwsRequest {
  constructor(
    public readonly principalString: string,
    public readonly resourceIdentifier: { resource: string; accountId: string },
    public readonly actionString: string,
    public readonly context: RequestContext
  ) {}

  get action(): RequestAction {
    return new RequestActionImpl(this.actionString)
  }

  get resource(): RequestResource {
    return new ResourceRequestImpl(
      this.resourceIdentifier.resource,
      this.resourceIdentifier.accountId
    )
  }

  get principal(): RequestPrincipal {
    return new RequestPrincipalImpl(this.principalString)
  }

  public contextKeyExists(key: string): boolean {
    return this.context.contextKeyExists(key)
  }

  public getContextKeyValue(key: string): ContextKey {
    if (!this.contextKeyExists(key)) {
      throw new Error(`Invalid context key: ${key}`)
    }
    return this.context.contextKeyValue(key)
  }
}
