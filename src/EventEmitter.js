const { internalProp } = require('./utils')

let _callbacks = {}
const privateProps = new WeakMap()
const internal = internalProp(privateProps)

class EventEmitter {
  constructor(sdk, config = {}) {
    const self = internal(this)
    self._events = new Set()
    self._maxListeners = parseInt(config.maxListeners, 10) || null
    self._sdk = sdk

    return this
  }

  _addCallback(event, callback, context, weight) {
    this._getCallbacks(event).push({
      callback,
      context,
      weight
    })

    this._getCallbacks(event)
      .sort((a, b) => b.weight - a.weight)

    return this
  }

  _getCallbacks(event) {
    return _callbacks[event]
  }

  _has(event) {
    return internal(this)._events.has(event)
  }

  listenersCount(event) {
    return this._has(event) ? _callbacks[event].length : 0
  }

  _maxListenersReached(event) {
    return (
      internal(this)._maxListeners !== null && 
      internal(this)._maxListeners <= this.listenersCount(event)
    )
  }

  _getCallbackIndex(event, cb) {
    return (
      this._has(event) ?
      this._getCallbacks(event).findIndex(e => e.callback === cb) :
      -1
    )
  }

  _callbackExists(event, cb, context) {
    const cbIdx = this._getCallbackIndex(event, cb)
    const activeCb = cbIdx !== -1 ?
      this._getCallbacks(event)[cbIdx] : void 0
    return (
      cbIdx !== -1 && 
      activeCb &&
      activeCb.context === context
    )
  }

  on(event, callback, context = null, weight = 1) {
    const self = internal(this)

    if (typeof callback !== 'function') {
      throw new TypeError(`${callback} is not a function`);
    }

    if (!this._has(event)) {
      self._events.add(event)
      _callbacks[event] = []
    } else {
      if (this._maxListenersReached(event)) {
        self._sdk.logger.warn(`Max listeners (${self._maxListeners})` +
        ` for event "${event}"!`)
      }

      if (this._callbackExists(...arguments)) {
        self._sdk.logger.warn(`Event "${event}"` +
          ` already has the callback ${callback}.`)
      }
    }

    return this._addCallback(...arguments)
  }

  emit(event, ...args) {
    const self = internal(this)
    self._sdk._logger.debug(`EventEmitter:emit:${event}`, args)
    const evObjs = _callbacks[event]
    if (evObjs) {
      for (let ev of evObjs) {
        ev.context ? ev.callback.call(ev.context, ...args) : ev.callback.call(...args)
      }
    }

    return this
  }

  clear() {
    internal(this)._events.clear()
    _callbacks = {}
    return this
  }

  remove(event, cb = null) {
    const self = internal(this)

    if (this._has(event)) {
      if (cb === null) {
        self._events.delete(event)
        _callbacks[event] = null
      } else {
        const cbIdx = this._getCallbackIndex(event, cb)

        if (cbIdx !== -1) {
          this._getCallbacks(event).splice(cbIdx, 1)
          this.remove(...arguments)
        }
      }
    }

    return this
  }

  once(event, callback, context = null, weight = 1) {
    const onceCallback = (...args) => {
      this.remove(event, onceCallback)
      return callback.call(context, args)
    }

    return this.on(event, onceCallback, context, weight)
  }
}

module.exports = EventEmitter