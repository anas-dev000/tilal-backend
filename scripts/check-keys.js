import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the .env files
const backendEnvPath = path.resolve(__dirname, '../.env');
const storageEnvPath = path.resolve(__dirname, '../../remote-storage-server/.env');

console.log('🔍 Check-Keys Script Starting...');
console.log(`📂 Backend .env: ${backendEnvPath}`);
console.log(`📂 Storage .env: ${storageEnvPath}`);

function readEnvKey(filePath, keyName) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const envConfig = dotenv.parse(content);
  return envConfig[keyName];
}

const keyName = 'STORAGE_SERVER_API_KEY';

const backendKey = readEnvKey(backendEnvPath, keyName);
const storageKey = readEnvKey(storageEnvPath, keyName);

console.log('--- Comparison Results ---');

if (!backendKey) {
  console.error(`❌ ${keyName} is missing in Backend .env`);
} else {
  console.log(`✅ Backend Key found: "${backendKey.substring(0, 3)}...${backendKey.slice(-3)}" (Length: ${backendKey.length})`);
}

if (!storageKey) {
  console.error(`❌ ${keyName} is missing in Storage Server .env`);
} else {
  console.log(`✅ Storage Key found: "${storageKey.substring(0, 3)}...${storageKey.slice(-3)}" (Length: ${storageKey.length})`);
}

if (backendKey && storageKey) {
  if (backendKey === storageKey) {
    console.log('\n🎉 SUCCESS: Keys MATCH exactly!');
  } else {
    console.error('\n❌ FAILURE: Keys DO NOT MATCH!');
    console.error(`Backend Length: ${backendKey.length}`);
    console.error(`Storage Length: ${storageKey.length}`);
    
    if (backendKey.trim() === storageKey.trim()) {
      console.error('⚠️ Warning: Keys match if trimmed. Check for hidden whitespace!');
    }
  }
}
