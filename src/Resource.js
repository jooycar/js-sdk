const request = require('./Request')
const { internalProp } = require('./utils')

const privateProps = new WeakMap()
const internal = internalProp(privateProps)

const SILENT_FETCH = false
const PAGINATION_ENABLED = false
const PAGE_SIZE = 10

const truthy = val => val !== null && val !== undefined

/**
 * @ignore
 */
class Resource {
  constructor(sdk, spec) {
    const _private = internal(this)
    if (!spec.command) throw new Error("Resource spec without command")
    this.domainPrefix = truthy(spec.domainPrefix) ? spec.domainPrefix : sdk._domainPrefix
    this.host = spec.host || sdk._host
    this.namespace = truthy(spec.namespace) ? spec.namespace : sdk._apiNamespace
    this.version = truthy(spec.version) ? spec.version : sdk._version
    this.module = truthy(spec.module) ? spec.module : sdk._module
    this.extension = truthy(spec.extension) ? spec.extension : sdk._extension
    this.method = (spec.method || 'GET').toLowerCase()
    this.protocol = spec.protocol || sdk._protocol
    this.basepath = spec.basepath || sdk._basepath
    this.headers = {}
    this.port = spec.port || sdk._port
    this.command = spec.command
    this.silentFetch = spec.silentFetch || SILENT_FETCH
    this.paginationEnabled = spec.paginationEnabled || PAGINATION_ENABLED

    _private._sdk = sdk
    _private._pageSize = spec.pageSize || PAGE_SIZE
    _private._currentPage = 1
    _private._params = {}
  }

  fetch(params, cb) {
    if (typeof params === 'function' && !cb) cb = params
    if (typeof cb !== 'function') return this._fetchAsync(params)
    
    this._fetchAsync(params)
      .then(result => cb(null, result))
      .catch(cb)
  }

  setToken(token) {
    const _private = internal(this)
    _private._resourceToken = token
  }

  addParams(params = {}) {
    const _private = internal(this)
    Object.assign(_private._params, params)
  }

  setParams(params = {}) {
    const _private = internal(this)
    _private._params = params
  }

  async _fetchAsync(providedParams = {}) {
    const _private = internal(this)
    const sdk = _private._sdk
    const emitter = sdk._EventEmitter
    const logger = sdk._logger
    const transactionId = sdk._getTransactionId()
    emitter.emit('resource:startFetching', { transactionId })
    try {
      const params = Object.assign(_private._params, providedParams)
      const result = await this._makeRequest(params)
      emitter.emit('resource:endFetching', { transactionId })
      return result
    } catch (err) {
      logger.error(err)
      emitter.emit('resource:endFetching', { transactionId })
      throw (err)
    }
  }

  then() {
    const promise = this._fetchAsync()
    return promise.then.apply(promise, arguments)
  }

  setHeader(key, val) {
    if (typeof key === "object") {
      for (k in key) {
        this.setHeader(k, key[k])
      }
      return
    }
    
    Object.assign(this.headers, {[key]: val})
  }

  async _makeRequest(json = {}) {
    const _private = internal(this)
    const token = _private._resourceToken || _private._sdk._key
    const headers = Object.assign(this.headers, {'Authorization': `Bearer ${token}`})
    const endpoint = this.endpoint(json)
    const req = await request[this.method](endpoint, { json, headers })
    if (_private._sdk._debug) _private._sdk._logger.debug(`Fetching: ${endpoint}`)
    if (_private._sdk._debug) _private._sdk._logger.debug(req)
    const result = req.json
    return result
  }

  endpoint(params = {}) {
    const protocol = this.protocol
    const prefix = this.domainPrefix ? this.domainPrefix + '.' : ''
    const host = this.host
    const basepath = this.basepath ? '/' + this.basepath : ''
    const namespace = this.namespace ? '/' + this.namespace : ''
    const version = this.version ? '/' + this.version : ''
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

const resourceFactory = spec => sdk => new Resource(sdk, spec)

module.exports = {
  Resource,
  resourceFactory
}