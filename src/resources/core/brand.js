const { makeResource } = require('../Resource')

const list = makeResource({
  module: 'core',
  method: 'GET',
  command: 'brands'
})

module.exports = {
  list
}