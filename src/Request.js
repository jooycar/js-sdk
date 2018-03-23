// if (!process.browser) {
//   global.fetch = require('node-fetch')
//   global.Headers = global.fetch.Headers
// }
import { internalProp } from './utils'
/**
 * @external {Response} https://developer.mozilla.org/en-US/docs/Web/API/Response
 */

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
const caseless = require('caseless')
/**
 * @private
 * @ignore
 */
const toTypedArray = require('typedarray-to-buffer')

/**
 * @private
 * @ignore
 */
const makeHeaders = obj => new Headers(obj)

/**
 * @private
 * @ignore
 */
const makeBody = value => {
  if (typeof value === 'string') {
    value = Buffer.from(value)
  }
  if (Buffer.isBuffer(value)) {
    value = toTypedArray(value)
  }
  return value
}

/**
 * When a {@link Resource} instance needs to start interaction with the server,
 * it creates a Request instance that manages the data, headers and wraps the
 * Fetch API to make it easier to handle.
 *
 * The Request object is thenable, so you can await on itself and it will execute
 * the request and resolve with the Fetch API Response object.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 * @example
 * const someResource = ...
 * const request = someResource.newRequest()
 * request.setData({ foo: 'bar' }) // Set data if needed
 * const response = await request // Executes the request
 * // Handle response...
 */
export default class Request {
  /**
   * For internal use. Creates a new request object with the provided {@link SDK} instance
   * and arguments
   * @param {SDK} sdk SDK to be attached to this Request
   * @param {...String|Object} args Arguments of the Request. The first String argument will be
   * the url the Request should point to. The first Object argument will be the settings
   * passed to the fetch call.
   */
  constructor (sdk, ...args) {
    const _private = internal(this)
    _private._sdk = sdk
    _private._transactionId = sdk._getTransactionId()
    /**
     * @private
     * @ignore
     */
    this.opts = { method: 'GET' }
    /**
     * @private
     * @ignore
     */
    this._headers = {}
    /**
     * @private
     * @ignore
     */
    this._caseless = caseless(this._headers)

    let failSet = () => {
      throw new Error('Cannot set read-only property.')
    }
    const resolveResWith = way => resp => resp.clone()[way]()

    const ways = ['json', 'text', 'arrayBuffer', 'blob', 'formData']
    ways.forEach(way =>
      Object.defineProperty(this, way, {
        get: () => this.response.then(resolveResWith(way)),
        set: failSet
      })
    )
    this._args(...args)

    const emitter = sdk._EventEmitter
    const logger = sdk._logger
    const transactionId = _private._transactionId

    /**
     * @private
     * @ignore
     */
    this.response = Promise.resolve()
      .then(() => this._request())
      .then((resp) => {
        emitter.emit('request:endFetching', { transactionId })
        return resp
      }, (err) => {
        logger.error(err)
        emitter.emit('request:endFetching', { transactionId })
        throw (err)
      })
  }

  /**
   * @private
   * @ignore
   */
  _args (...args) {
    let opts = this.opts
    if (typeof args[0] === 'string') {
      opts.url = args.shift()
    }
    if (typeof args[0] === 'object') {
      opts = Object.assign(opts, args.shift())
    }
    if (opts.headers) this.setHeaders(opts.headers)
    this.opts = opts
  }

  /**
   * Thenable method to execute this Request.
   *
   * Promise will resolve with the Response object from the Fetch API.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
   * @returns {Promise<Response>} A promise that resolves with the Response object from the Fetch API
   * @example
   * const request = ...
   * const resp = await request
   * // Handle Response object (e.g. parse JSON response)
   * const jsonData = await resp.json()
   */
  then () {
    const promise = this.response
    return promise.then.apply(promise, arguments)
  }

  /**
   * @deprecated
   * Sets HTTP method and other configuration for the Fetch API
   * @param {String} verb HTTP method (GET, POST, etc.)
   * @param {...String|Object} args Same as args from {@link src/request.js~Request#constructor}
   * @returns {Request} This instance
   */
  method (verb, ...args) {
    this.opts.method = verb.toUpperCase()
    this._args(...args)
    return this
  }

  /**
   * @private
   * @ignore
   */
  _request () {
    const _private = internal(this)
    const sdk = _private._sdk
    const emitter = sdk._EventEmitter
    const logger = sdk._logger
    const transactionId = _private._transactionId
    let url = this.opts.url
    delete this.opts.url

    if (this.opts.data) {
      this.opts.body = JSON.stringify(this.opts.data)
      this.setHeader('content-type', 'application/json')
      delete this.opts.data
    }

    if (this.opts.body) {
      this.opts.body = makeBody(this.opts.body)
    }

    if (this.opts.method) {
      this.opts.method = this.opts.method.toUpperCase()
    }

    this.opts.headers = makeHeaders(this._headers)

    if (sdk._debug) logger.debug(`Fetching: ${endpoint}`)
    if (sdk._debug) logger.debug(req)
    emitter.emit('request:startFetching', { transactionId })
    return fetch(url, this.opts)
  }

  /**
   * Sets a data object to be sent as the Request body.
   * @param {String|Object} key If Object, all of the object properties
   * will be added to the data. If String, then it will be the key of the
   * entry to add
   * @param {Object|Array|String|Number|Boolean} val Value of the entry to add
   * @returns {Request} This instance
   * @example
   * request.setData('foo', 123)
   * request.setData('bar', 'baz')
   * request.setData({ attr1: 'val1', attr2: [1, 3, 5] })
   */
  setData(key, val) {
    if (typeof this.opts.data !== 'object') {
      this.opts.data = {}
    }

    if (typeof key === "object") {
      for (let k in key) {
        this.setData(k, key[k])
      }
    } else {
      Object.assign(this.opts.data, {[key]: val})
    }

    return this
  }

  /**
   * Set headers to be sent with this Request.
   * @param {Object} obj Object whose properties will be the headers to be set
   * @returns {Request} This instance
   * @example
   * request.setHeaders({ 'content-length': '20', 'content-type', 'application/json' })
   */
  setHeaders (obj) {
    for (let key in obj) {
      this._caseless.set(key, obj[key])
    }
    return this
  }

  /**
   * Set a header to be sent with this Request.
   * @param {String} key The key of the header to add
   * @param {String} value The value of the header to add
   * @returns {Request} This instance
   * @example
   * request.setHeader('content-length', '20')
   */
  setHeader (key, value) {
    let o = {}
    o[key] = value
    return this.setHeaders(o)
  }
}