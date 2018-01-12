const models = {
  brand: require('./brand')
}

const injectSDK = (obj, sdk) => {
  return Object.keys(obj).reduce((acc, k) => {
    return Object.assign(acc, {[k] : obj[k](sdk)})
  }, {})
}

module.exports = async sdk => {
  return Object.keys(models).reduce((acc, key) => {
    return Object.assign(acc, {[key]: injectSDK(models[key], sdk)})
  }, {})
}