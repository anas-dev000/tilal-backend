import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, '../.env');

console.log('🔧 Force-Fix-URL Script Starting...');

try {
  let content = fs.readFileSync(backendEnvPath, 'utf8');
  
  // Regex to find STORAGE_SERVER_URL=... and capture the value
  // We look for the specific domain we saw in logs: dimgrey-scorpion-565603.hostingersite.com
  // And replace ".com/" with ".com"
  
  const originalContent = content;
  
  // Generic fix for any trailing slash on valid URL chars
  // Matches: STORAGE_SERVER_URL=http.../ (maybe followed by whitespace or EOL)
  content = content.replace(/(STORAGE_SERVER_URL=https?:\/\/[^\s]+)\/(\s*$|\n)/gm, '$1$2');
  
  // Specific fix for the user's domain just in case
  content = content.replace(/hostingersite\.com\//g, 'hostingersite.com');

  if (content !== originalContent) {
    fs.writeFileSync(backendEnvPath, content, 'utf8');
    console.log('✅ Trailing slash REMOVED successfully.');
    console.log('👉 Please RESTART your back-end-tilal server now.');
  } else {
    console.log('ℹ️ No trailing slash found to remove (File unchanged).');
    // Print the line to be sure
    const match = content.match(/STORAGE_SERVER_URL=.*/);
    console.log(`   Current Line: ${match ? match[0] : 'Not Found'}`);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
