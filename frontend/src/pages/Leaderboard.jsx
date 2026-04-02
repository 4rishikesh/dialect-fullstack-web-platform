import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/leaderboard')
      .then(r => setBoard(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = board.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  const getRankBadge = (i) => {
    if (i === 0) return { emoji: '🥇', color: '#f5c542' };
    if (i === 1) return { emoji: '🥈', color: '#c0c0c0' };
    if (i === 2) return { emoji: '🥉', color: '#cd7f32' };
    return { emoji: `#${i + 1}`, color: 'var(--muted)' };
  };

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1 }}>

        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>🏆 Global Leaderboard</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Top debaters ranked by Elo rating — Public Mode only</p>
          </div>
          <input className="input" style={{ width: 220 }} placeholder="Search username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {user?.mode === 'ghost' && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
            <span>👻</span>
            <span style={{ color: 'var(--text2)' }}>You're in Ghost Mode. <strong style={{ color: 'var(--text)' }}>Switch to Public Mode</strong> on your dashboard to appear here.</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <div style={{ color: 'var(--text2)' }}>No public debaters found yet. Be the first!</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 100px 80px 80px 80px 90px', gap: 0, padding: '10px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <div>Rank</div><div>Debater</div><div style={{ textAlign: 'right' }}>ELO</div>
              <div style={{ textAlign: 'right' }}>W</div><div style={{ textAlign: 'right' }}>L</div>
              <div style={{ textAlign: 'right' }}>Total</div><div style={{ textAlign: 'right' }}>Vocab</div>
            </div>

            {filtered.map((u, i) => {
              const { emoji, color } = getRankBadge(i);
              const isMe = u._id === user?._id;
              const wr = u.totalDebates > 0 ? Math.round((u.wins / u.totalDebates) * 100) : 0;
              return (
                <div key={u._id} style={{
                  display: 'grid', gridTemplateColumns: '52px 1fr 100px 80px 80px 80px 90px',
                  padding: '14px 20px', borderBottom: '1px solid var(--border)',
                  background: isMe ? 'var(--accent-glow)' : 'transparent',
                  transition: 'background 0.15s', alignItems: 'center'
                }}
                  onMouseEnter={e => !isMe && (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => !isMe && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color }}>{emoji}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{u.username} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>(you)</span>}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{wr}% win rate</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{u.eloRating}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--green)' }}>{u.wins}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--red)' }}>{u.losses}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{u.totalDebates}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{u.avgVocabScore || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}