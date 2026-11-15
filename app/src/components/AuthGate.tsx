import { useEffect, useState, type ReactNode } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { getAuthStatus, login } from '../api/authClient';
import { analysisErrorMessage } from '../api/analysisClient';

type Mode = 'checking' | 'login' | 'ready' | 'offline';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const check = async () => {
    setMode('checking');
    setError('');
    try {
      const status = await getAuthStatus();
      setMode(status.authenticated ? 'ready' : 'login');
    } catch (caught) {
      setError(analysisErrorMessage(caught));
      setMode('offline');
    }
  };

  useEffect(() => {
    void check();
    const onUnauthorized = () => {
      setMode('login');
      setError('登录已过期，请重新输入访问密码。');
    };
    window.addEventListener('qihuang:unauthorized', onUnauthorized);
    return () => window.removeEventListener('qihuang:unauthorized', onUnauthorized);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setError('请输入访问密码。');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(password);
      setPassword('');
      setMode('ready');
    } catch (caught) {
      setError(analysisErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'ready') return <>{children}</>;

  return (
    <div className="login-screen">
      <div className="login-ornament login-ornament-a" />
      <div className="login-ornament login-ornament-b" />
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-seal small">黄</span>
          <div>
            <strong>岐黄 · 状态</strong>
            <span>QIHUANG STATE</span>
          </div>
        </div>

        <div className="login-heading">
          <span className="panel-kicker">LOCAL CLINIC / 本机诊所</span>
          <h1>进入病例工作台</h1>
          <p>病例、分析和报告保存在本机服务端。请输入访问密码后继续。</p>
        </div>

        {mode === 'checking' ? (
          <div className="login-loading">
            <Loader2 size={16} className="spin" />
            正在检查本地服务…
          </div>
        ) : mode === 'offline' ? (
          <div className="login-offline">
            <p>{error || '无法连接本地服务。'}</p>
            <button className="btn btn-gold" onClick={check}>重新检查</button>
          </div>
        ) : (
          <form className="login-form" onSubmit={submit}>
            <label className="field">
              <span>访问密码</span>
              <div className="login-input-wrap">
                <KeyRound size={14} />
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="输入 server/.env.local 中的访问密码"
                  autoComplete="current-password"
                />
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-gold login-submit" type="submit" disabled={submitting}>
              {submitting ? <><Loader2 size={14} className="spin" /> 验证中…</> : <>进入工作台</>}
            </button>
          </form>
        )}

        <div className="login-foot">
          <ShieldCheck size={13} />
          <span>Backend Lite · 本机访问 · 不替代医生诊断</span>
        </div>
      </div>
    </div>
  );
}
