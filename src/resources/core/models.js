const { makeResource } = require('../Resource')

const list = makeResource({
  module: 'core',
  method: 'GET',
  command: 'models'
})

module.exports = {
  list
}