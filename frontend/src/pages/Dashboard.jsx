import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user, updateMode, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [modeLoading, setModeLoading] = useState(false);
  const [modeError, setModeError] = useState('');

  useEffect(() => {
    api.get('/debate/history').then(r => setHistory(r.data.sessions || [])).catch(() => {});
  }, []);

  const toggleMode = async () => {
    setModeError('');
    setModeLoading(true);
    try {
      const next = user.mode === 'ghost' ? 'public' : 'ghost';
      await updateMode(next);
    } catch (err) {
      setModeError(err.response?.data?.message || 'Could not update mode');
    } finally { setModeLoading(false); }
  };

  const winRate = user.totalDebates > 0 ? Math.round((user.wins / user.totalDebates) * 100) : 0;

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.mode === 'ghost' ? user?.ghostAlias : user?.username}</span>
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Your debate dashboard — track progress, challenge others.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/lobby')}>
            ⚔ Find a Debate
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard label="ELO Rating" value={user?.eloRating} sub="Skill rating" />
          <StatCard label="Total Debates" value={user?.totalDebates} sub="All time" />
          <StatCard label="Wins" value={user?.wins} sub={`${winRate}% win rate`} />
          <StatCard label="Losses" value={user?.losses} />
          <StatCard label="Vocab Score" value={user?.avgVocabScore || '—'} sub="Avg across debates" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Recent debates */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Recent Debates
            </h2>
            {history.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎙</div>
                <div style={{ color: 'var(--text2)', marginBottom: 16 }}>No debates yet. Jump into the lobby!</div>
                <button className="btn btn-primary" onClick={() => navigate('/lobby')}>Start Debating</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(s => {
                  const isA = true; // we'll determine from API
                  const result = s.winner === 'draw' ? 'draw' : 'ended';
                  return (
                    <div key={s.roomId} onClick={() => navigate(`/report/${s.roomId}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontSize: 20 }}>{s.mode === 'text' ? '💬' : s.mode === 'voice' ? '🎤' : '📹'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s.topic}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {s.mode} · {new Date(s.endTime).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`badge ${s.winner === 'draw' ? 'badge-amber' : 'badge-blue'}`}>
                        {s.winner === 'draw' ? 'Draw' : 'Ended'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 60, textAlign: 'right' }}>View Report →</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side panel - identity mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text2)' }}>
                Identity Mode
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>{user?.mode === 'ghost' ? '👻' : '🌐'}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.mode === 'ghost' ? 'Ghost Mode' : 'Public Mode'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {user?.mode === 'ghost' ? `Alias: ${user?.ghostAlias}` : `@${user?.username}`}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                {user?.mode === 'ghost'
                  ? 'You are debating anonymously. Opponents see your alias only. You are not shown on the leaderboard.'
                  : 'Your real profile is visible. You appear on the global leaderboard.'}
              </div>
              {modeError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{modeError}</div>}
              <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }} onClick={toggleMode} disabled={modeLoading}>
                {modeLoading ? 'Updating...' : `Switch to ${user?.mode === 'ghost' ? 'Public' : 'Ghost'} Mode`}
              </button>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text2)' }}>
                Quick Actions
              </h3>
              {[
                { label: '⚔ Find a Match', path: '/lobby' },
                { label: '🏆 Leaderboard', path: '/leaderboard' },
                { label: '📊 Debate History', path: '/history' }
              ].map(a => (
                <button key={a.path} className="btn btn-ghost" style={{ width: '100%', marginBottom: 8, justifyContent: 'flex-start', fontSize: 13 }} onClick={() => navigate(a.path)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}