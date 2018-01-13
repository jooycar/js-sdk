const request = require('../request')
const SILENT_FETCH = false

class Resource {
  constructor(sdk, spec) {
    if (!spec.command) throw new Error("Resource spec without command")
    this.method = (spec.method || 'GET').toLowerCase()
    this.module = spec.module || sdk._module
    this.protocol = spec.protocol || sdk._protocol
    this.version = spec.version || sdk._version
    this.command = spec.command

    // TODO: Implement log level from remote resource
    this.logLevel = 'info'
    this._sdk = sdk
    this.silentFetch = spec.silentFetch || SILENT_FETCH
  }

  fetch(params, cb) {
    const transactionId = this._sdk._getTransactionId()
    this._sdk._EventEmitter.emit('resource:startFetching', { transactionId })
    this._makeRequest(params)
      .then(result => {
        this._sdk._EventEmitter.emit('resource:endFetching', { transactionId })
        this.SDK._logger.info(result)
        cb(null, result)
      })
      .catch(err => {
        this.sdk._logger.error(err)
        cb(err)
      })
  }

  async fetchAsync(params) {
    const transactionId = this._sdk._getTransactionId()
    this._sdk._EventEmitter.emit('resource:startFetching', { transactionId })
    try {
      const result = await this._makeRequest(params)
      this._sdk._EventEmitter.emit('resource:endFetching', { transactionId })
      return result
    } catch (err) {
      this._sdk._logger.error(err)
      this._sdk._EventEmitter.emit('resource:endFetching', { transactionId })
      throw (err)
    }
  }

  async _makeRequest(json = {}) {
    const protocol = this.protocol
    const prefix = this._sdk._domain_prefix
    const host = this._sdk._host
    const namespace = this._sdk._apiNamespace
    const version = this.version
    const module = this.module
    const command = this.command
    const endpoint = `${protocol}://${prefix}.${host}/${namespace}/${version}/${module}/${command}`
    const headers = this.headers || {}
    const result = await request[this.method](endpoint, { json, headers }).json
    return result
  }
}

const makeResource = spec => sdk => new Resource(sdk, spec)

module.exports = {
  Resource,
  makeResource
}