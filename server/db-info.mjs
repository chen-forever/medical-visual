import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serverDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverDir, '.env.local');
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.error('无法读取 .env.local：', error.message);
    process.exitCode = 1;
  }
}

const defaultPath = join(serverDir, 'data', 'qihuang.sqlite');
const configured = process.env.DATABASE_PATH?.trim() || defaultPath;
const dbPath = isAbsolute(configured) ? configured : resolve(process.cwd(), configured);

function fileInfo(path) {
  if (!existsSync(path)) return '不存在';
  return `${statSync(path).size.toLocaleString('zh-CN')} bytes`;
}

console.log('数据库路径：', dbPath);
console.log('主文件：', fileInfo(dbPath));
console.log('WAL：', fileInfo(`${dbPath}-wal`));
console.log('SHM：', fileInfo(`${dbPath}-shm`));

if (!existsSync(dbPath)) {
  console.log('数据库尚未创建；启动 server 后会自动创建。');
  process.exit(0);
}

try {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  db.exec('PRAGMA query_only = ON;');
  const count = table => {
    try {
      return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    } catch {
      return 0;
    }
  };
  console.log('病例：', count('cases'));
  console.log('分析记录：', count('analyses'));
  console.log('药方：', count('formulas'));
  console.log('报告：', count('reports'));
  console.log('审计事件：', count('events'));
  db.close();
} catch (error) {
  console.error('读取数据库失败：', error.message);
  process.exitCode = 1;
}
