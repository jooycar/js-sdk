const { resourceFactory } = require('../../Resource')

const list = resourceFactory({
  module: 'core',
  method: 'GET',
  command: 'models'
})

module.exports = {
  list
}