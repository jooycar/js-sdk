const JooycarSDK = require('./JooycarSDK')

const main = async () => {
  const JC = new JooycarSDK({
    key: 'jooycar',
    secret: 'jooycar',
    debug: false
  })

  JC.on('startFetching', () => console.log('SDK started fetching'))
  JC.on('resource:endFetching', () => console.log('resource is fetching'))
  JC.on('endFetching', () => console.log('SDK finished fetching'))
  JC.on('resourcesFetched', (val) => console.log('SDK Resources fetched', val))

  const { brands } = JC.loadResource({command: 'brands'}, 'listAll')
  const { models } = JC.loadResource({command: 'models'})

  console.log(JC.describeResources())
  console.log(brands.listAll)

  const brandList = await brands.listAll
  console.log(brandList)
}

main()