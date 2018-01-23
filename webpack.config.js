const path = require('path');

module.exports = {
  entry: './src/JooycarSDK.js',
  output: {
    filename: 'jooycar-sdk.min.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var',
    library: 'Jooycar'
  }
};