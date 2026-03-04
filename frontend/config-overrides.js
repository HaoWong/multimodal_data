/**
 * React App Rewired 配置
 * 用于覆盖 react-scripts 的默认 webpack 配置
 * 修复 onAfterSetupMiddleware 和 onBeforeSetupMiddleware 弃用警告
 */

const { override, overrideDevServer } = require('react-app-rewired');

// 覆盖 webpack 配置
const overrideWebpack = (config) => {
  // 修复 Jest 测试时 axios ES 模块问题
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  
  // 确保 Jest 配置正确
  if (process.env.NODE_ENV === 'test') {
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
  }
  
  return config;
};

// 覆盖 devServer 配置 - 修复弃用警告
const overrideDevServerConfig = () => {
  return (configFunction) => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost);
      
      // 删除弃用的选项
      delete config.onAfterSetupMiddleware;
      delete config.onBeforeSetupMiddleware;
      
      // 使用新的 setupMiddlewares 选项
      config.setupMiddlewares = (middlewares, devServer) => {
        // 如果需要自定义中间件，可以在这里添加
        return middlewares;
      };
      
      return config;
    };
  };
};

module.exports = {
  webpack: overrideWebpack,
  devServer: overrideDevServerConfig(),
};
