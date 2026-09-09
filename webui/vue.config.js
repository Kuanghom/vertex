module.exports = {
  publicPath: '/',
  outputDir: '../app/static',
  assetsDir: 'assets',
  devServer: {
    port: '8080',
    host: '0.0.0.0',
    https: false,
    open: false,
    proxy: {
      '/api/': {
        target: process.env.VERTEX_API || 'http://159.195.108.91:3000',
        changeOrigin: true,
        ws: true,
        pathRewrite: { '^/api': '/api' },
        secure: false
      },
      '/proxy/': {
        target: process.env.VERTEX_API || 'http://159.195.108.91:3000',
        changeOrigin: true,
        ws: true,
        pathRewrite: { '^/proxy': '/proxy' },
        secure: false
      }
    }
  },
  chainWebpack: config => {
    config.plugin('html')
      .tap(args => {
        args[0].title = 'Vertex';
        return args;
      });
    const { execSync } = require('child_process');
    const moment = require('moment');
    const safeExec = function (command, fallback) {
      try {
        return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch (e) {
        return fallback;
      }
    };
    config.optimization.splitChunks({
      chunks: 'all',
      cacheGroups: {
        echarts: {
          name: 'chunk-echarts',
          test: /[\\/]node_modules[\\/](echarts|zrender|vue-echarts)[\\/]/,
          chunks: 'async',
          priority: 30,
          reuseExistingChunk: true
        }
      }
    });
    config.plugin('define').tap((args) => {
      const updateTime = safeExec('git log --pretty=format:%at -1', '');
      const head = safeExec('git rev-parse HEAD', 'local');
      const commitInfo = safeExec('git log --pretty=format:%s -1', 'local build');
      const version = safeExec('git describe --tags', require('./package.json').version);
      args[0]['process.env'].version = JSON.stringify({
        updateTime: updateTime ? moment(updateTime * 1000).utcOffset(8).format('YYYY-MM-DD HH:mm:ss') : moment().utcOffset(8).format('YYYY-MM-DD HH:mm:ss'),
        head: head.substring(0, 12),
        commitInfo,
        version: version.split('-')[0]
      });
      return args;
    });
  },
  pwa: {
    name: 'VERTEX', // 名字
    themeColor: '#0099E3', // 背景颜色
    appleMobileWebAppCapable: true, // 苹果WebApp支持
    manifestPath: 'assets/manifest.json',
    appleMobileWebAppStatusBarStyle: 'black-translucent',
    msTileColor: '#0099E3',

    // manifest 设置
    manifestOptions: {
      name: 'VERTEX',
      short_name: 'VERTEX',
      start_url: '/',
      display: 'standalone',
      icons: require('./public/assets/pwaicons/icons.json').icons
    },

    // workbox
    workboxOptions: {
      swDest: 'service-worker.js',
      skipWaiting: true,
      clientsClaim: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallbackDenylist: [/^\/api/, /^\/proxy/],
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/proxy/'),
          handler: 'NetworkOnly'
        }
      ],
      exclude: [
        /\.map$/,
        /\.mp4$/,
        /login-bg/,
        /\.less$/,
        /page-/,
        /chunk-echarts/,
        /pwaicons\/windows11/,
        /pwaicons\/ios\/(1024|256|512|180|167|152|144|128|120|114|100|87|80|76|72|64|60|58|57|50|40|29|20)\.png$/,
        /fonts\/(alex-brush|great-vibes|jason-handwriting)/,
        /^manifest.*\.js(?:on)?$/,
        /^assets\/pwaicons\/.*ico$/,
        /^assets\/icons\/.*.ico/,
        /^api/,
        /^index/
      ]
    },

    // 图标
    iconPaths: {
      faviconSVG: 'assets/images/logo.svg',
      favicon32: 'assets/pwaicons/ios/32.png',
      favicon16: 'assets/pwaicons/ios/16.png',
      appleTouchIcon: 'assets/pwaicons/ios/512.png',
      maskIcon: 'assets/pwaicons/ios/512.png',
      msTileImage: 'assets/pwaicons/ios/512.png'
    }
  }
};
