const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  // Main process configuration
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/main/main.ts',
    target: 'electron-main',
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/main': path.resolve(__dirname, 'src/main'),
        '@/renderer': path.resolve(__dirname, 'src/renderer'),
        '@/shared': path.resolve(__dirname, 'src/shared')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
          },
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'sqlite3': 'commonjs sqlite3',
      'node-record-lpcm16': 'commonjs node-record-lpcm16'
    },
  },
  // Preload script configuration
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
          },
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
  // Renderer process configuration
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/main': path.resolve(__dirname, 'src/main'),
        '@/renderer': path.resolve(__dirname, 'src/renderer'),
        '@/shared': path.resolve(__dirname, 'src/shared')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
      }),
    ],
    devServer: {
      port: 3000,
      hot: true,
    },
  },
];