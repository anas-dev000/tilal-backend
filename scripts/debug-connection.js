import 'dotenv/config';
import axios from 'axios';

const STORAGE_URL = process.env.STORAGE_SERVER_URL;

console.log('🔍 Debugging Storage Connection...');
console.log(`🎯 Configured URL: "${STORAGE_URL}"`);

if (!STORAGE_URL) {
  console.error('❌ Error: STORAGE_SERVER_URL is missing in .env');
  process.exit(1);
}

async function checkHealth() {
  const healthUrl = `${STORAGE_URL}/health`;
  const uploadUrl = `${STORAGE_URL}/upload`;

  console.log(`\n1️⃣  Testing Health Endpoint: ${healthUrl}`);
  try {
    const response = await axios.get(healthUrl);
    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   ✅ Data:`, response.data);
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    if (error.response) {
      console.error(`      Status: ${error.response.status}`);
      console.error(`      Data:`, error.response.data);
    }
  }

  console.log(`\n2️⃣  Verifying Upload Endpoint URL Construction:`);
  console.log(`   👉 The app will POST to: ${uploadUrl}`);
  
  if (STORAGE_URL.endsWith('/')) {
    console.warn('   ⚠️ WARNING: STORAGE_SERVER_URL ends with a slash. This might result in double slashes (e.g. //upload).');
  }
  if (STORAGE_URL.endsWith('/upload')) {
    console.warn('   ⚠️ WARNING: STORAGE_SERVER_URL already includes "/upload". This will result in "/upload/upload".');
  }
}

checkHealth();
