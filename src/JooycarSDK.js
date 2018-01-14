const { internalProp } = require('./utils')
const { resourceFactory } = require('./Resource')
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
const DEFAULT_EXTENSION = null
const DEBUG_MODE = false
const DEFAULT_RESOURCES_SPEC = {command: 'resources'}

const privateProps = new WeakMap()
const internal = internalProp(privateProps)

const validSpec = spec => {
  return typeof spec == 'object' && spec.hasOwnProperty('command')
}

class JooycarSDK {
  constructor(config = {}) {
    const _private = internal(this)
    const resourcesSpec = config.resourcesSpec || DEFAULT_RESOURCES_SPEC

    _private._transactionCounter = 0
    _private._currentTransactions = new Set()
    _private._rawConfig = config
    _private._resources = {}
    _private._resourcesLoaded = false
    _private._resourcesSpec = resourcesSpec

    this._debug = config.debug || DEBUG_MODE
    this._host = config.host || HOST
    this._domainPrefix = config.domainPrefix || DOMAIN_PREFIX
    this._apiNamespace = config.apiNamespace || API_NAMESPACE
    this._extension = config.extension || DEFAULT_EXTENSION
    this._version = config.version || VERSION
    this._protocol = config.protocol || PROTOCOL
    this._module = config.protocol || DEFAULT_MODULE
    this._EventEmitter = new EventEmitter(this)
    this._logger = config.logger || logger(this)

    if (config.key) _private.key = config.key || DEFAULT_KEY
    if (config.secret) _private.secret = config.secret || DEFAULT_SECRET

    this.on('resource:startFetching', this._handleStartFetching)
    this.on('resource:endFetching', this._handleEndFetching)
    this._init()
  }

  _init() {
    const _private = internal(this)
    const resourcesSpec = _private._resourcesSpec
    _private._resourcesResource = resourceFactory(resourcesSpec)(this)
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

  _handleEndFetching({ transactionId }) {
    const _private = internal(this)
    _private._currentTransactions.delete(transactionId)
    if (_private._currentTransactions.size === 0) {
      this._EventEmitter.emit('endFetching')
    }
  }

  _addResources(resources) {
    const _private = internal(this)
    Object.assign(_private._resources, resources)
  }

  describeResources() {
    const _private = internal(this)
    return _private._resources
  }

  flushResources() {
    const _private = internal(this)
    _private._resources = {}
    _private._resourcesLoaded = false
  }

  async loadResources(spec) {
    const _private = internal(this)

    if (spec && spec !== _private._resourcesSpec) {
      this.flushResources()
    }

    if (_private._resourcesLoaded) {
      this._logger.debug('SDK:getResources() - Cached')
      this._EventEmitter.emit('resourcesReady', {fromCache: true})
      return _private._resources
    }

    if (spec) {
      if (!validSpec(spec))
        throw new Error("Invalid resource specification")

      _private._resourcesResource = resourceFactory(spec)(this)
    }

    const resourcesSpecs = await _private._resourcesResource
    
    for (let s of resourcesSpecs) {
      if (!validSpec(s)) {
        this._logger.warn(`Invalid remote resource specification ${s}`)
        continue
      }

      this.addResource(s)
    }

    _private._resourcesLoaded = true

    this._logger.debug('SDK:getResources() - Remote')
    this._EventEmitter.emit('resourcesReady', {fromCache: false})

    return _private._resources
  }

  addResource(spec, action, model) {
    if (!validSpec(spec))
        throw new Error("Invalid resource specification")

    const resourceName = model || spec.model || spec.command
    const resourceAction = action || spec.action || spec.method || 'get'

    if (!resourceName) throw new Error("Missing resource name")
    const actionObj = {[resourceAction]: resourceFactory(spec)(this)}
    const resource = {[resourceName]: actionObj}
    this._addResources(resource)

    return resource
  }

  isFetching() {
    return this._currentTransactions.size > 0
  }

  on(event, cb, context = this) {
    this._EventEmitter.on(event, cb, context, 2)
  }
}

module.exports = JooycarSDK