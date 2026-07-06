module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // Ensure development mode for React DevTools and LocatorJS
      if (env === 'development') {
        // Ensure source maps are generated properly for LocatorJS
        webpackConfig.devtool = 'eval-cheap-module-source-map';
        
        // Force React development mode
        webpackConfig.resolve.alias = {
          ...webpackConfig.resolve.alias,
          'react-dom$': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        };
        
        // Set development mode explicitly in DefinePlugin
        const definePlugin = webpackConfig.plugins.find(
          plugin => plugin.constructor.name === 'DefinePlugin'
        );
        if (definePlugin) {
          definePlugin.definitions['process.env.NODE_ENV'] = JSON.stringify('development');
        }
      }
      
      return webpackConfig;
    }
  },
  devServer: {
    // Enable hot reloading and proper development mode
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  }
};