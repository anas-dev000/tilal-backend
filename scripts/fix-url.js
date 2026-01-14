import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, '../.env');

console.log('🔧 Fix-URL Script Starting...');

function getEnvContent(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function updateEnvUrl(content) {
  const lines = content.split('\n');
  let updated = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith('STORAGE_SERVER_URL=')) {
      const [key, value] = line.split('=');
      if (value && value.trim().endsWith('/')) {
        console.log(`⚠️ Found trailing slash in: ${value.trim()}`);
        const newValue = value.trim().slice(0, -1);
        console.log(`✅ Fixed value to: ${newValue}`);
        updated = true;
        return `${key}=${newValue}`;
      }
    }
    return line;
  });
  
  if (!updated) {
    console.log('✅ URL looks fine (no trailing slash found).');
  }
  return newLines.join('\n');
}

const content = getEnvContent(backendEnvPath);
if (!content) {
  console.error('❌ Error: Could not read .env file');
  process.exit(1);
}

const newContent = updateEnvUrl(content);

fs.writeFileSync(backendEnvPath, newContent, 'utf8');

console.log('🎉 Successfully updated back-end-tilal/.env!');
console.log('👉 Please RESTART your back-end-tilal server now.');
