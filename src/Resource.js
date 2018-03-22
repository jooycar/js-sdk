import Request from './Request'
import { internalProp } from './utils'

const privateProps = new WeakMap()
const internal = internalProp(privateProps)

const SILENT_FETCH = false
const PAGINATION_ENABLED = false
const PAGE_SIZE = 10
const isObjEmpty = obj => Object.keys(obj).length === 0 && obj.constructor === Object
const truthy = val => val !== null && val !== undefined

export default class Resource {
  constructor(sdk, spec) {
    const _private = internal(this)
    if (!spec.module) throw new Error("Resource spec without module")
    this.domainPrefix = truthy(spec.domainPrefix) ? spec.domainPrefix : sdk._domainPrefix
    this.host = spec.host || sdk._host
    this.namespace = truthy(spec.namespace) ? spec.namespace : sdk._namespace
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

  async _fetchAsync(providedParams) {
    return await this.newRequest(providedParams).json
  }

  then() {
    const promise = this._fetchAsync()
    return promise.then.apply(promise, arguments)
  }

  setHeader(key, val) {
    if (typeof key === "object") {
      for (let k in key) {
        this.setHeader(k, key[k])
      }
      return
    }
    
    Object.assign(this.headers, {[key]: val})
  }

  newRequest(providedParams = {}) {
    const _private = internal(this)
    const token = _private._resourceToken || _private._sdk._apiKey
    const headers = Object.assign(this.headers, token ? {'Authorization': `Bearer ${token}`} : {})
    const data = Object.assign(_private._params, providedParams);
    const endpoint = this.endpoint(data)
    const { method } = this;
    const params = Object.assign({ headers, method }, method === 'get' || isObjEmpty(data) ? {} : {data})
    return new Request(_private._sdk, endpoint, params)
  }

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

export const resourceFactory = spec => sdk => new Resource(sdk, spec)