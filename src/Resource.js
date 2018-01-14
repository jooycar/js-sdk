const request = require('./request')
const { internalProp } = require('./utils')

const privateProps = new WeakMap()
const internal = internalProp(privateProps)

const SILENT_FETCH = false
const PAGINATION_ENABLED = false
const PAGE_SIZE = 10

class Resource {
  constructor(sdk, spec) {
    const _private = internal(this)

    if (!spec.command) throw new Error("Resource spec without command")
    this.method = (spec.method || 'GET').toLowerCase()
    this.module = spec.module || sdk._module
    this.protocol = spec.protocol || sdk._protocol
    this.version = spec.version || sdk._version
    this.command = spec.command
    this.silentFetch = spec.silentFetch || SILENT_FETCH
    this.paginationEnabled = spec.paginationEnabled || PAGINATION_ENABLED

    _private._sdk = sdk
    _private._pageSize = spec.pageSize || PAGE_SIZE
    _private._currentPage = 1
    _private._params = {}
  }

  fetch(params, cb) {
    const _private = internal(this)
    const sdk = _private._sdk
    const emitter = sdk._EventEmitter
    const logger = sdk._logger
    const transactionId = sdk._getTransactionId()

    emitter.emit('resource:startFetching', { transactionId })
    this._makeRequest(params)
      .then(result => {
        emitter.emit('resource:endFetching', { transactionId })
        logger.info(result)
        cb(null, result)
      })
      .catch(err => {
        logger.error(err)
        cb(err)
      })
  }

  addParams(params = {}) {
    const _private = internal(this)
    Object.assign(_private._params, params)
  }

  setParams(params = {}) {
    const _private = internal(this)
    _private._params = params
  }

  async fetchAsync(providedParams = {}) {
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
    const promise = this.fetchAsync()
    return promise.then.apply(promise, arguments)
  }

  async _makeRequest(json = {}) {
    const _private = internal(this)
    const sdk = _private._sdk
    const protocol = this.protocol
    const prefix = sdk._domain_prefix
    const host = sdk._host
    const namespace = sdk._apiNamespace
    const version = this.version
    const module = this.module
    const command = this.command
    const endpoint = `${protocol}://${prefix}.${host}/${namespace}/${version}/${module}/${command}`
    const headers = this.headers || {}
    const result = await request[this.method](endpoint, { json, headers }).json
    return result
  }
}

const resourceFactory = spec => sdk => new Resource(sdk, spec)

module.exports = {
  Resource,
  resourceFactory
}