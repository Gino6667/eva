const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '美髮沙龍管理系統 API',
      version: '1.0.0',
      description: '自動產生的 API 文件，支援互動測試與查詢。'
    }
  },
  apis: ['./index.js'] // 以 JSDoc 註解自動產生
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}; 