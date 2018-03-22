// if (!process.browser) {
//   global.fetch = require('node-fetch')
//   global.Headers = global.fetch.Headers
// }
import { internalProp } from './utils'
const privateProps = new WeakMap()
const internal = internalProp(privateProps)

const caseless = require('caseless')
const toTypedArray = require('typedarray-to-buffer')

const makeHeaders = obj => new Headers(obj)

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
 * @ignore
 */
export default class Request {
  constructor (sdk, ...args) {
    const _private = internal(this)
    _private._sdk = sdk
    _private._transactionId = sdk._getTransactionId()
    this.opts = { method: 'GET' }
    this._headers = {}
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

  then () {
    const promise = this.response
    return promise.then.apply(promise, arguments)
  }

  method (verb, ...args) {
    this.opts.method = verb.toUpperCase()
    this._args(...args)
    return this
  }
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

  setHeaders (obj) {
    for (let key in obj) {
      this._caseless.set(key, obj[key])
    }
    return this
  }
  setHeader (key, value) {
    let o = {}
    o[key] = value
    return this.setHeaders(o)
  }
}