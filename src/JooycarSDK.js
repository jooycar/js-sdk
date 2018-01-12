const { internalProp } = require('./utils')
const resourceFactory = require('./resources')
const EventEmitter = require('./EventEmitter')
const logger = require('./logger')

const HOST = 'jooycar.com'
const DOMAIN_PREFIX = 'api01'
const API_NAMESPACE = 'api'
const VERSION = 'V1'
const DEFAULT_MODULE = 'core'
const PROTOCOL = 'https'
const DEFAULT_KEY = 'jooycar'
const DEFAULT_SECRET = 'jooycar'

const privateProps = new WeakMap()
const internal = internalProp(privateProps)

class JooycarSDK {
  constructor(config = {}) {
    const _private = internal(this)

    _private._transactionCounter = 0
    _private._currentTransactions = new Set()
    _private._rawConfig = config

    this._host = HOST
    this._domain_prefix = DOMAIN_PREFIX
    this._api_namespace = API_NAMESPACE
    this._version = VERSION
    this._protocol = PROTOCOL
    this._defaultModule = DEFAULT_MODULE
    this._EventEmitter = new EventEmitter(this)
    this._logger = config.logger || logger(this)

    if (config.key) _private.key = config.key || DEFAULT_KEY
    if (config.secret) _private.secret = config.secret || DEFAULT_SECRET

    this.on('resource:startFetching', this._handleStartFetching)
    this.on('resource:finishFetching', this._handleFinishFetching)
  }

  _getTransactionId() {
    const _private = internal(this)
    return ++_private._transactionCounter
  }

  _handleStartFetching({ transactionId }) {
    const _private = internal(this)
    _private._currentTransactions.add(transactionId)
    if (_private._currentTransactions.size === 1) {
      this._EventEmitter.emit('startFetching')
    }
  }

  _handleFinishFetching({ transactionId }) {
    const _private = internal(this)
    _private._currentTransactions.delete(transactionId)
    if (_private._currentTransactions.size === 0) {
      this._EventEmitter.emit('finishFetching')
    }
  }

  async getResources() {
    if (this.resources) {
      this._logger.debug('JCSDK:getResources() - Cached')
      this._EventEmitter.emit('RESOURCE:CACHE')
      return this.resources
    }
    const resources = await resourceFactory(this)
    this._resources = resources
    this._logger.debug('JCSDK:getResources() - Async')
    this._EventEmitter.emit('RESOURCE:ASYNC')
    return this._resources
  }

  isFething() {
    return this._currentTransactions.size() > 0
  }

  on(event, cb, context = this) {
    this._EventEmitter.on(event, cb, context, 2)
  }
}

module.exports = JooycarSDK