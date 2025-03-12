
/**
 * API 配置
 * 这个文件用于配置 API 相关的参数
 */

window.apiConfig = {
  // API 端点
  endpoint: 'https://api.example.com/v1/chat/completions', // 替换为实际 API 地址
  
  // API 密钥，如果需要的话
  apiKey: '', // 注意：实际项目中应使用环境变量或密钥管理系统存储密钥
  
  // 模型名称
  model: 'gpt-4-vision-preview', // 替换为实际使用的模型
  
  // 最大输出令牌数
  maxTokens: 4000
};
