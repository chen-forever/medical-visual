import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureSessionSecret,
  envFilePath,
  getEnvValue,
  readEnvFile,
  upsertEnvValue,
  validatePassword,
  writeEnvFileAtomic,
} from './env-file.mjs';

const serverDir = dirname(fileURLToPath(import.meta.url));
const envPath = envFilePath(serverDir);
const examplePath = fileURLToPath(new URL('./.env.example', import.meta.url));
const rotateSession = process.argv.includes('--rotate-session');

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('需要在交互式终端中运行，不能通过管道输入密码。'));
      return;
    }
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';
    let finished = false;
    let escapeRemaining = 0;

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (typeof stdin.setRawMode === 'function') stdin.setRawMode(false);
      stdin.pause();
    };

    const finish = result => {
      if (finished) return;
      finished = true;
      cleanup();
      stdout.write('\n');
      resolve(result);
    };

    const onData = chunk => {
      for (const char of chunk) {
        if (escapeRemaining > 0) {
          escapeRemaining -= 1;
          continue;
        }
        if (char === '\u001b') {
          escapeRemaining = 2;
          continue;
        }
        if (char === '\u0003') {
          finished = true;
          cleanup();
          stdout.write('\n');
          reject(new Error('已取消。'));
          return;
        }
        if (char === '\r' || char === '\n') {
          finish(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (char < ' ') continue;
        value += char;
        stdout.write('*');
      }
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const first = await readHidden('设置新的登录密码：');
  const second = await readHidden('再次输入确认：');
  if (first !== second) {
    console.error('两次输入不一致，未修改密码。');
    process.exitCode = 1;
    return;
  }
  const problem = validatePassword(first);
  if (problem) {
    console.error(problem);
    process.exitCode = 1;
    return;
  }

  const base = existsSync(envPath)
    ? readEnvFile(envPath)
    : existsSync(examplePath)
      ? readEnvFile(examplePath)
      : '';
  let content = upsertEnvValue(base, 'APP_ACCESS_PASSWORD', first);
  content = ensureSessionSecret(content, { rotate: rotateSession });
  writeEnvFileAtomic(envPath, content);

  console.log(`登录密码已更新：${envPath}`);
  if (rotateSession) console.log('登录会话已全部失效，需要重新登录。');
  if (!getEnvValue(content, 'DEEPSEEK_API_KEY').trim()) {
    console.log('提示：DEEPSEEK_API_KEY 仍为空，真实分析前需要补上。');
  }
  console.log('请重启 server 后生效。');
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
