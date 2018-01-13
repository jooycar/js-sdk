const JooycarSDK = require('./JooycarSDK')

const main = async () => {
  const JC = new JooycarSDK({
    key: 'jooycar',
    secret: 'jooycar',
    debug: false
  })

  JC.on('startFetching', () => console.log('SDK started fetching'))
  // JC.on('resource:endFetching', () => console.log('resource is fetching'))
  JC.on('endFetching', () => console.log('SDK finished fetching'))
  JC.on('resourcesFetched', (val) => console.log('SDK Resources fetched', val))
  
  try {
    await JC.getResources()
    const { brand, models } = await JC.getResources()
    await Promise.all([1, 2, 3].map(_ => brand.list.fetchAsync()))
    console.log('Got brands several times')
  } catch (error) {
    console.log(error)
  }
}

main()