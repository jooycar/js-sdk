if (!process.browser) {
  global.fetch = require('node-fetch')
  global.Headers = global.fetch.Headers
}

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
class Request {
  constructor (...args) {
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

    this.response = Promise.resolve().then(() => this._request())
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

  method (verb, ...args) {
    this.opts.method = verb.toUpperCase()
    this._args(...args)
    return this
  }
  _request () {
    let url = this.opts.url
    delete this.opts.url

    if (this.opts.json) {
      this.opts.body = JSON.stringify(this.opts.json)
      this.setHeader('content-type', 'application/json')
      delete this.opts.json
    }

    if (this.opts.body) {
      this.opts.body = makeBody(this.opts.body)
    }

    this.opts.headers = makeHeaders(this._headers)

    return fetch(url, this.opts)
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

module.exports = (...args) => new Request(...args)
module.exports.put = (...args) => new Request().method('put', ...args)
module.exports.get = (...args) => new Request().method('get', ...args)
module.exports.post = (...args) => new Request().method('post', ...args)
module.exports.head = (...args) => new Request().method('head', ...args)
module.exports.patch = (...args) => new Request().method('patch', ...args)
module.exports.delete = (...args) => new Request().method('delete', ...args)