import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const STORAGE_URL = process.env.STORAGE_SERVER_URL || 'http://localhost:3000';
const API_KEY = process.env.STORAGE_SERVER_API_KEY;

console.log('🧪 Testing Remote Storage Upload...');
console.log(`Target: ${STORAGE_URL}`);

if (!API_KEY) {
  console.error('❌ Error: STORAGE_SERVER_API_KEY is missing in .env');
  process.exit(1);
}

const testFile = path.join(__dirname, '../package.json'); // Use package.json as dummy file

async function runTest() {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('folder', 'test_debug');

    console.log('📤 Sending request...');
    
    // Explicitly targeting the /upload endpoint
    // If STORAGE_URL includes /upload path, we should handle that, but usually it's base URL
    const uploadUrl = STORAGE_URL.endsWith('/upload') ? STORAGE_URL : `${STORAGE_URL}/upload`;

    const response = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    console.log('✅ Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('❌ Failed:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

runTest();
