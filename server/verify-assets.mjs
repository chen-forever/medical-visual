import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../app/public/models/human-atlas/', import.meta.url));
const checks = [
  { file: 'atlas.json', minBytes: 500_000 },
  { file: 'body-core.bin.gz', minBytes: 5_000_000 },
];

let failed = false;
for (const check of checks) {
  const path = join(root, check.file);
  try {
    const size = statSync(path).size;
    if (size < check.minBytes) {
      console.error(`[assets] ${check.file} 太小：${size} bytes`);
      failed = true;
      continue;
    }
    const head = readFileSync(path).subarray(0, 32).toString('utf8');
    if (head.includes('git-lfs.github.com')) {
      console.error(`[assets] ${check.file} 仍是 Git LFS 指针，不能用于 ZIP/普通 clone。`);
      failed = true;
      continue;
    }
    console.log(`[assets] ${check.file}: ${size.toLocaleString('zh-CN')} bytes`);
  } catch (error) {
    console.error(`[assets] 无法读取 ${check.file}: ${error.message}`);
    failed = true;
  }
}

const gzipPath = join(root, 'body-core.bin.gz');
if (existsSync(gzipPath)) {
  const gzipHead = readFileSync(gzipPath).subarray(0, 2);
  if (gzipHead[0] !== 0x1f || gzipHead[1] !== 0x8b) {
    console.error('[assets] body-core.bin.gz 不是合法 gzip。');
    failed = true;
  }
} else {
  failed = true;
}

if (failed) process.exit(1);
console.log('[assets] 模型资产检查通过。');
