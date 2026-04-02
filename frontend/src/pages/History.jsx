import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/debate/history')
      .then(r => setSessions(r.data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const modeIcon = m => ({ text: '💬', voice: '🎤', video: '📹' }[m] || '💬');

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Debate History</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Your last 20 debates</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
            <div style={{ color: 'var(--text2)', marginBottom: 16 }}>No debate history yet.</div>
            <button className="btn btn-primary" onClick={() => navigate('/lobby')}>Start Your First Debate</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map(s => (
              <div key={s.roomId} onClick={() => navigate(`/report/${s.roomId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 24, width: 36, textAlign: 'center', flexShrink: 0 }}>{modeIcon(s.mode)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s.topic}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {s.userAAliasInSession} vs {s.userBAliasInSession} · {new Date(s.endTime).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${s.winner === 'draw' ? 'badge-amber' : 'badge-blue'}`}>
                  {s.winner === 'draw' ? 'Draw' : `Winner: ${s.winner}`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 80, textAlign: 'right' }}>View Report →</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}