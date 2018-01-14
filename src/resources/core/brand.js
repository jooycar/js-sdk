const { resourceFactory } = require('../../Resource')

const list = resourceFactory({
  module: 'core',
  method: 'GET',
  command: 'brands'
})

module.exports = {
  list
}