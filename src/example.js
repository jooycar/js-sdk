const JooycarSDK = require('./JooycarSDK')

const main = async () => {
  const resourcesSpec = {
    protocol: 'http',
    version: '',
    module: '',
    namespace: '',
    port: 8080,
    domainPrefix: '',
    host: '127.0.0.1',
    command: 'resources',
    extension: 'json'
  }

  const JC = new JooycarSDK({
    key: 'jooycar',
    secret: 'jooycar',
    debug: false,
    resourcesSpec
  })

  // JC.on('resource:endFetching', () => console.log('resource is fetching'))
  JC.on('startFetching', () => console.log('SDK started fetching'))
  JC.on('endFetching', () => console.log('SDK finished fetching'))
  JC.on('resourcesReady', (val) => console.log('SDK Resources fetched', val))

  const { models, brands } = await JC.loadResources(/* resourcesSpec */)

  // const { brands } = JC.addResource({command: 'brands'}, 'list')
  // const { models } = JC.addResource({command: 'models'})

  console.log(JC.describeResources())
  
  const brandList = await brands.list
  console.log("brands count", brandList.length)
}

main()