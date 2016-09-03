module.exports = {
  devtool: 'source-map',
  entry: ['babel-polyfill', './js/main.js'],
  output: {
    path: 'dist/js',
    filename: '[name].js',
  },
  watch: true,
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015'],
        },
      },
    ],
  },
};
