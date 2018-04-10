import Request from './Request'
import { internalProp } from './utils'

/**
 * @private
 * @ignore
 */
const privateProps = new WeakMap()
/**
 * @private
 * @ignore
 */
const internal = internalProp(privateProps)

/**
 * @private
 * @ignore
 */
const SILENT_FETCH = false
/**
 * @private
 * @ignore
 */
const PAGINATION_ENABLED = false
/**
 * @private
 * @ignore
 */
const PAGE_SIZE = 10
/**
 * @private
 * @ignore
 */
const isObjEmpty = obj => Object.keys(obj).length === 0 && obj.constructor === Object
/**
 * @private
 * @ignore
 */
const truthy = val => val !== null && val !== undefined

/**
 * This class represents each of the resource specifications obtained from the SDK after
 * {@link SDK}.resource() resolves. It allows you to connect and use the available API services.
 *
 * To use it, you should generate a new Request by calling resource.{@link newRequest}(),
 * passing any configuration if required, before executing the request.
 * @example
 * let request = resource.newRequest()
 * const response = await request;
 */
export default class Resource {
  /**
   * Normally you should not need to manually instantiate resources.
   * @param {SDK} sdk The SDK object attached to this Resource
   * @param {Object} spec The spec that defines this Resource
   */
  constructor(sdk, spec) {
    const _private = internal(this)
    if (!spec.module) throw new Error("Resource spec without module")
    /**
     * @private
     * @ignore
     */
    this.domainPrefix = truthy(spec.domainPrefix) ? spec.domainPrefix : sdk._domainPrefix
    /**
     * @private
     * @ignore
     */
    this.host = spec.host || sdk._host
    /**
     * @private
     * @ignore
     */
    this.namespace = truthy(spec.namespace) ? spec.namespace : sdk._namespace
    /**
     * @private
     * @ignore
     */
    this.version = truthy(spec.version) ? spec.version : sdk._version
    /**
     * @private
     * @ignore
     */
    this.module = truthy(spec.module) ? spec.module : sdk._module
    /**
     * @private
     * @ignore
     */
    this.extension = truthy(spec.extension) ? spec.extension : sdk._extension
    /**
     * @private
     * @ignore
     */
    this.method = (spec.method || 'GET').toLowerCase()
    /**
     * @private
     * @ignore
     */
    this.protocol = spec.protocol || sdk._protocol
    /**
     * @private
     * @ignore
     */
    this.basepath = spec.basepath || sdk._basepath
    /**
     * @private
     * @ignore
     */
    this.headers = {}
    /**
     * @private
     * @ignore
     */
    this.port = spec.port || sdk._port
    /**
     * @private
     * @ignore
     */
    this.command = spec.command
    /**
     * @private
     * @ignore
     */
    this.silentFetch = spec.silentFetch || SILENT_FETCH
    /**
     * @private
     * @ignore
     */
    this.paginationEnabled = spec.paginationEnabled || PAGINATION_ENABLED

    _private._sdk = sdk
    _private._pageSize = spec.pageSize || PAGE_SIZE
    _private._currentPage = 1
    _private._params = {}
  }

  /**
   * @deprecated
   * You should now use {@link newRequest} method to execute a {@link Request}.
   *
   * Creates and executes a {@link Request} instance with the provided params,
   * and runs cb if request succeeds or fails.
   * @param {Object|Function} [params] If Object, this will be the parameters that
   * the Resource could need to instantiate the {@link Request} object and execute it.
   * If Function and only one argument passed, it will be treated as the second argument.
   * @param {function(error: Object, result: Object)} [cb] Function to be called when the request resolves and response
   * data is available to consume, or it fails and throws and Error. Function should
   * accept two parameters (error, result).
   * @returns {Promise<Object>|void} If no callback function is passed, it will return a Promise that will
   * resolve with the data from the Response.
   * @example
   * resource.fetch({ foo: 'bar' }, (err, result) => {
   *   if (err) {
   *     console.error('Error :(', err)
   *   } else {
   *     console.log('Result is', result)
   *   }
   * })
   */
  fetch(params, cb) {
    if (typeof params === 'function' && !cb) cb = params
    if (typeof cb !== 'function') return this._fetchAsync(params)
    
    this._fetchAsync(params)
      .then(result => cb(null, result))
      .catch(cb)
  }

  /**
   * Sets an auth token to use with requests created from this Resource.
   * @param {String} token Token to use for auth purposes
   */
  setToken(token) {
    const _private = internal(this)
    _private._resourceToken = token
  }

  /**
   * @deprecated You should now use {@link Request}.setData()
   * Adds parameters to the existing parameters defined on this Resource instance.
   * @param {Object} [params={}] New params to be added to the {@link Request}
   * @example
   * resource.addParams({ foo: 'bar' })
   * // current params are { foo: 'bar' }
   * resource.addParams({ baz: 'xyz' })
   * // current params are { foo: 'bar', baz: 'xyz' }
   */
  addParams(params = {}) {
    const _private = internal(this)
    Object.assign(_private._params, params)
  }

  /**
   * @deprecated You should now use {@link Request}.setData()
   * Sets parameters to this Resource instance. This will reset any previous params
   * set on the Resource.
   * @param {Object} [params={}] Parameters to be set to the {@link Request}
   * @example
   * resource.setParams({ foo: 'bar' })
   * // current params are { foo: 'bar' }
   * resource.setParams({ baz: 'xyz' })
   * // current params are { baz: 'xyz' }
   */
  setParams(params = {}) {
    const _private = internal(this)
    _private._params = params
  }

  /**
   * @private
   * @ignore
   */
  async _fetchAsync(providedParams) {
    return await this.newRequest(providedParams).json
  }

  /**
   * Thenable method to execute a new {@link Request} from this Resource with the
   * current params set by {@link setParams} and/or {@link addParams}.
   *
   * Promise will resolve with the data from the Response object.
   * @returns {Promise<Object>} A promise that should fulfill with the data from the response object.
   * @example
   * const pingResource = ...
   * const res = await pingResource
   * console.log(res) // pong!
   */
  then() {
    const promise = this._fetchAsync()
    return promise.then.apply(promise, arguments)
  }

  /**
   * Sets a header or headers to be used with subsequent requests from this Resource.
   * @param {String|Object} key If Object, its keys/values will be the headers to
   * be set. If String, then it will be the key of the header to add.
   * @param {String} [val] If key argument was String, this will be the value of the
   * header to add.
   * @example
   * resource.setHeader({ 'content-length': '20', 'content-type', 'application/json' })
   * resource.setHeader('content-length', '20')
   */
  setHeader(key, val) {
    if (typeof key === "object") {
      for (let k in key) {
        this.setHeader(k, key[k])
      }
      return
    }
    
    Object.assign(this.headers, {[key]: val})
  }

  /**
   * Creates a new Request object using the current token and headers data set on this Resource.
   * Can also pass params which will be added to current Resource params.
   * @param {Object} [providedParams={}] Params to be set on the Request
   * @returns {Request} A {@link Request} instance that can be executed or be configured before execution.
   * @example
   * const getUserResource = ...
   * const request = getUserResource.newRequest({ id: 1 })
   * // Now request can still be configured or just run.
   */
  newRequest(providedParams = {}) {
    const _private = internal(this)
    const token = _private._resourceToken || _private._sdk._apiKey
    const headers = Object.assign(this.headers, token ? {'Authorization': `Bearer ${token}`} : {})
    const data = Object.assign(_private._params, providedParams);
    const endpoint = this.endpoint(data)
    const { method } = this;
    const params = Object.assign({ headers, method }, isObjEmpty(data) ? {} : {data})
    return new Request(_private._sdk, endpoint, params)
  }

  /**
   * Builds the Resource URL using spec and provided params if provided.
   *
   * For internal purposes, but still exposed for testing uses.
   * @param {Object} [params={}] Params to be used for building a custom endpoint if needed.
   * @returns {String} The fully built URL that points to the Resource on the server.
   */
  endpoint(params = {}) {
    const protocol = this.protocol
    const prefix = this.domainPrefix ? this.domainPrefix + '.' : ''
    const host = this.host
    const basepath = this.basepath ? '/' + this.basepath : ''
    const namespace = this.namespace ? '/' + this.namespace : ''
    const version = this.version ? '/v' + this.version : ''
    const module = this.module ? '/' + this.module : ''
    const port = this.port ? ':' + this.port : ''
    const extension = this.extension ? '.' + this.extension : ''
    const command = this.command ? '/' + this.command : ''
    const endpoint = `${protocol}://${prefix}${host}${port}${basepath}${namespace}${version}${module}${command}${extension}`
    return Object.keys(params).reduce((url, key) => {
      return url.split(`:${key}`).join(params[key])
    }, endpoint)
  }
}

/**
 * @private
 * @ignore
 */
export const resourceFactory = spec => sdk => new Resource(sdk, spec)