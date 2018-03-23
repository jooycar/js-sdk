import { internalProp } from './utils'
import { resourceFactory }  from './Resource'
import EventEmitter from './EventEmitter'
import {logger} from './logger'

/**
 * @private
 * @ignore
 */
const HOST = 'jooycar.com'
/**
 * @private
 * @ignore
 */
const DOMAIN_PREFIX = 'api01'
/**
 * @private
 * @ignore
 */
const BASEPATH = 'api'
/**
 * @private
 * @ignore
 */
const VERSION = '1'
/**
 * @private
 * @ignore
 */
const NAMESPACE = 'core'
/**
 * @private
 * @ignore
 */
const DEFAULT_MODULE = null
/**
 * @private
 * @ignore
 */
const PROTOCOL = 'https'
/**
 * @private
 * @ignore
 */
const DEFAULT_KEY = null
/**
 * @private
 * @ignore
 */
const DEFAULT_EXTENSION = null
/**
 * @private
 * @ignore
 */
const DEBUG_MODE = false
/**
 * @private
 * @ignore
 */
const DEFAULT_RESOURCES_SPEC = {module: 'resources'}
/**
 * @ignore
 */
const USER_SPEC = {
  "version": "1",
  "module": "auth",
  "model": "auth",
  "command": "local",
  "method": "POST",
  "action": "login",
  "namespace": "enduser"
}

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
const validSpec = spec => {
  return(
    typeof spec == 'object' &&
    spec.hasOwnProperty('module') &&
    spec.module
  )
}

/**
 * JooycarSDK Main class
 *
 * An instance of JooycarSDK will provide you all that is required to interact with
 * Jooycar Connected Car Platform. The interaction with the platform is mainly through
 * the [Resource] entity which abstract the different actions that can be performed
 * within the platform
 *
 * To load the resources you will need to call the resources() method and it will load
 * asynchronously all the resources that are available based on the provided [apiKey] from
 * the configuration object you provide when instantiating the SDK. Also, when a username
 * and password is used to authenticate a particular instace of the SDK, the resources
 * available for the User authenticated will be autimaticaly loaded into the SDK.
 *
 * @example
 * const JooycarSDK = require('./JooycarSDK')
 *
 * void async function() {
 *   try {
 *     const SDK = new JooycarSDK({apiKey: ''})
 *     await SDK.login('username', 'password')
 *     const { trip } = await sdk.resources()
 *
 *     const tripListResponse = await trip.list.newRequest()
 *     const tripList = await tripListResponse.json()
 *     console.log(tripList)
 *
 *     await sdk.logout()
 *   } catch (error) {
 *     console.error(error)
 *   }
 * }()
 */
export class SDK {

  /**
   * The constructor of the JooycarSDK recieves a single parameter with a configuration object.
   * @param {Object} config configuration object
   * @example
   * const SDK = new JooycarSDK({apiKey: ''})
   */
  constructor(config = {}) {
    const _private = internal(this)
    const resourcesSpec = config.resourcesSpec || DEFAULT_RESOURCES_SPEC

    _private._transactionCounter = 0
    _private._currentTransactions = new Set()
    _private._rawConfig = config
    _private._resources = {}
    _private._resourcesLoaded = false
    _private._logged = false
    _private._resourcesSpec = resourcesSpec
    _private._apiKey = config.apiKey || DEFAULT_KEY
    
    /**
     * @private
     * @ignore
     */
    this._debug = config.debug || DEBUG_MODE

    /**
     * @private
     * @ignore
     */
    this._host = config.host || HOST

    /**
     * @private
     * @ignore
     */
    this._domainPrefix = config.domainPrefix || DOMAIN_PREFIX

    /**
     * @private
     * @ignore
     */
    this._namespace = config.namespace || NAMESPACE

    /**
     * @private
     * @ignore
     */
    this._extension = config.extension || DEFAULT_EXTENSION

    /**
     * @private
     * @ignore
     */
    this._version = config.version || VERSION

    /**
     * @private
     * @ignore
     */
    this._basepath = config.basepath || BASEPATH

    /**
     * @private
     * @ignore
     */
    this._protocol = config.protocol || PROTOCOL

    /**
     * @private
     * @ignore
     */
    this._module = config.module || DEFAULT_MODULE

    /**
     * @private
     * @ignore
     */
    this._EventEmitter = new EventEmitter(this)

    /**
     * @private
     * @ignore
     */
    this._logger = config.logger || logger(this)

    /**
     * @private
     * @ignore
     */
    this._apiKey = config.apiKey || DEFAULT_KEY

    this.on('request:startFetching', this._handleStartFetching)
    this.on('request:endFetching', this._handleEndFetching)
    this._init()
  }

  /**
   * @private
   * @ignore
   */
  _init() {
    const _private = internal(this)
    const resourcesSpec = _private._resourcesSpec
    _private._resourcesResource = resourceFactory(resourcesSpec)(this)
  }

  /**
   * @private
   * @ignore
   */
  _getTransactionId() {
    const _private = internal(this)
    return ++_private._transactionCounter
  }

  /**
   * @private
   * @ignore
   */
  _handleStartFetching({ transactionId }) {
    const _private = internal(this)
    _private._currentTransactions.add(transactionId)
    if (_private._currentTransactions.size === 1) {
      this._EventEmitter.emit('startFetching')
    }
  }

  /**
   * @private
   * @ignore
   */
  _handleEndFetching({ transactionId }) {
    const _private = internal(this)
    _private._currentTransactions.delete(transactionId)
    if (_private._currentTransactions.size === 0) {
      this._EventEmitter.emit('endFetching')
    }
  }

  /**
   * @private
   * @ignore
   */
  _addResources(resource) {
    const _private = internal(this)
    const model = Object.keys(resource)[0]
    if (!_private._resources[model]) _private._resources[model] = {}
    Object.assign(_private._resources[model], resource[model])
  }

  /**
   * @private
   * @ignore
   */
  _pushResource(spec, action, model) {
    if (!validSpec(spec))
        throw new Error("Invalid resource specification")

    const resourceName = model || spec.model || spec.module
    const resourceAction = action || spec.action || spec.method || 'get'

    if (!resourceName) throw new Error("Missing resource name")
    const actionObj = {[resourceAction]: resourceFactory(spec)(this)}
    const resource = {[resourceName]: actionObj}
    this._addResources(resource)

    return resource
  }

  /**
   * @private
   * @ignore
   */
  _flushResources() {
    const _private = internal(this)
    _private._resources = {}
    _private._resourcesLoaded = false
    return true
  }

  /**
   * Fetch all resources available for the apiToken or logged User.
   * @param {Object} [spec] It is used to load resources using a different specification
   * @return {Object} Resources object
   * @example
   * const SDK = new JooycarSDK({key: ''});
   * const resources = await SDK.resources();
   * console.log(resources)
   * // {
   * //   Trip: {list: Resource{...} },
   * //   Vehicle: {list: Resource{...}, new: Resource{...}, info: Resource{...}},
   * //   Device: {info: Resource{...}, list: Resource{...}, attach: Resource{...}}
   * // }
   */
  async resources(spec) {
    const _private = internal(this)

    if (spec && spec !== _private._resourcesSpec) {
      this._flushResources()
    }

    if (_private._resourcesLoaded) {
      this._logger.debug('SDK:getResources() - Cached')
      this._EventEmitter.emit('resourcesReady', _private._resources)
      return _private._resources
    }

    if (spec && !validSpec(spec))
      throw new Error("Invalid resource specification")

    _private._resourcesResource = resourceFactory(spec || _private._resourcesSpec)(this)

    const resourcesSpecs = await _private._resourcesResource

    if (resourcesSpecs && resourcesSpecs.endpoints) {
      for (let s of resourcesSpecs.endpoints) {
        if (!validSpec(s)) {
          this._logger.warn(`Invalid remote resource specification`, s)
          continue
        }
        this._logger.debug('Adding resource to resource pool: ', s)
        this._pushResource(s)
      }
    }

    _private._resourcesLoaded = true

    this._logger.debug('SDK:getResources() - Remote')
    this._EventEmitter.emit('resourcesReady', _private._resources)

    return _private._resources
  }

  /**
   * Authenticate user and return all resources available for this User
   * @param {string} email User email
   * @param {string} password User password
   * @return {Object} Resources object
   * @example
   * const SDK = new JooycarSDK({ apiKey })
   * await SDK.login('username', 'password')
   */
  async login(email, password) {
    const _private = internal(this)
    const userResource = resourceFactory(USER_SPEC)(this)
    try {
      const { token } = await userResource.fetch({ email, password })
      this._apiKey = token
      _private._logged = true
      const resources = await this.resources()
      return resources
    } catch (error) {
      this._logger.error('SDK:login()', error)
      throw error
    }
  }

  /**
   * Logout the currently logged user (if there is any) an return the default logged out resources.
   * @return {Object} Logout the user and return the default resources for not logged SDK
   * @example
   * const SDK = new JooycarSDK({ apiKey })
   * await SDK.login('username', 'password')
   * await SDK.logout()
   */
  async logout() {
    const _private = internal(this)
    _private._logged = false
    this._apiKey = _private._apiKey
    const resources = await this.resources()
    return resources
  }

  /**
   * Boolean that informs whether the SDK is currently logged as a user or not
   * @return {Boolean} boolean indicating if the SDK is logged
   * @example
   * const SDK = new JooycarSDK({ apiKey })
   * console.log(SDK.isLogged()) // false
   * await SDK.login('username', 'password')
   * console.log(SDK.isLogged()) // true
   */
  isLogged() {
    const _private = internal(this)
    return _private._logged
  }

  /**
   * @return {Boolean} boolean indicating if the SDK is currently fetching any resource
   * @example
   * const SDK = new JooycarSDK({ apiKey })
   * const { brands } = await sdk.resources()
   * trip.list.then(() => console.log(SDK.isFetching()))
   * console.log(SDK.isFetching())
   * // true
   * // false
   */
  isFetching() {
    const _private = internal(this)
    return _private._currentTransactions.size > 0
  }

  /**
   * Register callback for specific events emitted by the SDK
   * @param {string} event name of the event to be watched
   * @param {function} callback callback to be executed when the event is emmited
   * @param {object} context context to which the callback will be called
   */
  on(event, callback, context = this) {
    this._EventEmitter.on(event, callback, context, 2)
  }
}