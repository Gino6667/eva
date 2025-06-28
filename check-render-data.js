const axios = require('axios');

async function checkRenderData() {
  try {
    console.log('🔍 檢查 Render 後端資料狀態...\n');
    
    // 檢查健康狀態
    console.log('1. 檢查健康狀態...');
    const healthResponse = await axios.get('https://eva-36bg.onrender.com/api/health');
    console.log('✅ 健康狀態:', healthResponse.data);
    
    // 檢查資料檔案狀態
    console.log('\n2. 檢查資料檔案狀態...');
    const dataResponse = await axios.get('https://eva-36bg.onrender.com/api/check-data');
    console.log('✅ 資料狀態:', dataResponse.data);
    
    if (dataResponse.data.adminAccountExists) {
      console.log('\n🎉 管理員帳號存在！可以正常登入');
    } else {
      console.log('\n❌ 管理員帳號不存在，需要重新部署');
    }
    
  } catch (error) {
    console.log('❌ 錯誤:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 404) {
      console.log('\n🔧 解決方案：需要重新部署 Render 後端');
    }
  }
}

checkRenderData(); 