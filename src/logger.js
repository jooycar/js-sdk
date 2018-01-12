const logger = SDK => ({
  info: (...args) => {
    console.log('[INFO]', ...args)
  },
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },
  debug: (...args) => {
    if (SDK._debug) console.log('[DEBUG]', ...args)
  },
  warn: (...args) => {
    console.log('[WARN]', ...args)
  }
})

module.exports = logger