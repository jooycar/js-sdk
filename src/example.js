const JooycarSDK = require('./JooycarSDK')

const main = async () => {
  const JC = new JooycarSDK({
    key: 'jooycar',
    secret: 'jooycar'
  })
  
  try {
    const { brand, models } = await JC.getResources()

    JC.on('startFetching', () => console.log('SDK started fetching'))
    JC.on('resource:finishFetching', () => console.log('resource is fetching'))
    JC.on('finishFetching', () => console.log('SDK finished fetching'))

    await Promise.all([1, 2, 3].map(_ => brand.list.fetchAsync()))
    console.log('Got brands several times')
  } catch (error) {
    console.log('AAAA', error)
  }
}

main()