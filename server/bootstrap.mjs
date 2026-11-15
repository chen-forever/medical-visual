import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverDir, '.env.local');
const examplePath = join(serverDir, '.env.example');

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error('缺少 server/.env.example，无法创建本地配置。');
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  console.log('已创建 server/.env.local（敏感字段为空）。');
} else {
  console.log('server/.env.local 已存在，未覆盖。');
}

console.log('');
console.log('下一步：');
console.log('  1. 运行 npm run auth:set-password 设置本机访问密码（可选）');
console.log('  2. 在 server/.env.local 填入 DEEPSEEK_API_KEY（可选）');
console.log('  3. 运行 npm start 并打开 http://127.0.0.1:8787/');
