import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode = 'login' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(mode);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (tab === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, #1a2240 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a1f30 0%, transparent 50%)'
    }}>
      {/* Hero strip */}
      <div style={{ padding: '40px 0 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>
          DIAL<span style={{ color: 'var(--accent)' }}>ECT</span>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          Debate-based Intelligent Adaptive Learning & Evaluation Platform
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: tab === t ? 'var(--surface3)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--muted)',
                  textTransform: 'capitalize'
                }}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="card fade-in" style={{ padding: 32 }}>
            <form onSubmit={submit}>
              {tab === 'register' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
                    Username
                  </label>
                  <input className="input" type="text" placeholder="your_handle" value={form.username}
                    onChange={set('username')} required minLength={3} maxLength={30} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
                  Email
                </label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email}
                  onChange={set('email')} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
                  Password
                </label>
                <input className="input" type="password" placeholder="••••••••" value={form.password}
                  onChange={set('password')} required minLength={6} />
              </div>

              {error && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid #e05c5c30', borderRadius: 6, color: 'var(--red)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? (
                  <span className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                ) : tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {tab === 'register' && (
              <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                New accounts start in <span style={{ color: 'var(--text2)' }}>Ghost Mode</span> with 1000 ELO
              </p>
            )}
          </div>

          {/* Feature bullets */}
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '👻', label: 'Ghost Mode', desc: 'Debate anonymously' },
              { icon: '⚡', label: 'Elo Matchmaking', desc: 'Fair skill-based pairing' },
              { icon: '🧠', label: 'AI Analysis', desc: 'Vocabulary coaching' },
              { icon: '📹', label: 'Voice & Video', desc: 'WebRTC debates' }
            ].map(f => (
              <div key={f.label} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}