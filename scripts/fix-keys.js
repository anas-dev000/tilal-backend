import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, '../.env');
const storageEnvPath = path.resolve(__dirname, '../../remote-storage-server/.env');

console.log('🔧 Fix-Keys Script Starting...');

function getEnvContent(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function updateEnvKey(content, key, value) {
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  return newLines.join('\n');
}

// 1. Read Storage Key (Source of Truth)
const storageContent = getEnvContent(storageEnvPath);
const storageConfig = dotenv.parse(storageContent);
const targetKey = storageConfig['STORAGE_SERVER_API_KEY'];

if (!targetKey) {
  console.error('❌ Error: Could not find STORAGE_SERVER_API_KEY in remote-storage-server/.env');
  process.exit(1);
}

console.log(`✅ Found correct key in Storage Server (Length: ${targetKey.length})`);

// 2. Read Backend Env
const backendContent = getEnvContent(backendEnvPath);

// 3. Update Content
const newBackendContent = updateEnvKey(backendContent, 'STORAGE_SERVER_API_KEY', targetKey);

// 4. Write Back
fs.writeFileSync(backendEnvPath, newBackendContent, 'utf8');

console.log('🎉 Successfully updated back-end-tilal/.env with the correct API Key!');
console.log('👉 Please RESTART your back-end-tilal server now.');
