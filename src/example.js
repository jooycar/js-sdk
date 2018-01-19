const JooycarSDK = require('./JooycarSDK')

const username = 'username@example.com'
const password = 'password'
const apiKey = '...'

void async function() {
  try {
    const SDK = new JooycarSDK({ apiKey, resourcesSpec })
    await SDK.login(username, password)
    const { trip } = await sdk.resources()

    const tripList = await trip.list
    console.log(tripList)

    await sdk.logout()
  } catch (error) {
    console.error(error)
  }
}()