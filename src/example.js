const JooycarSDK = require('./JooycarSDK')

const main = async () => {
  const JC = new JooycarSDK({
    key: 'jooycar',
    secret: 'jooycar'
  })
  
  try {
    const { brand } = await JC.getResources()
    JC.on('startFetching', () => console.log('SDK started fetching'))
    JC.on('resource:startFetching', () => console.log('resource is fetching'))
    JC.on('finishFetching', () => console.log('SDK finished fetching'))
    await Promise.all([1, 2, 3].map(_ => brand.list.fetchAsync()))
    console.log('Got brands 3 times')
  } catch (error) {
    console.log('AAAA', error)
  }
}

main()