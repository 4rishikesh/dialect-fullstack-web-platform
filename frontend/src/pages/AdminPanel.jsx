import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
      background: active ? 'var(--surface3)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--muted)',
    }}>{children}</button>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('flags');
  const [flaggedSessions, setFlaggedSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banMsg, setBanMsg] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [flagsRes, lbRes] = await Promise.all([
        api.get('/leaderboard/admin/flags'),
        api.get('/leaderboard'),
      ]);
      setFlaggedSessions(flagsRes.data.sessions || []);
      setUsers(lbRes.data.leaderboard || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleBan = async () => {
    if (!banUserId || !banReason) { setBanMsg('Fill in user ID and reason'); return; }
    try {
      await api.post(`/leaderboard/admin/ban/${banUserId}`, { reason: banReason });
      setBanMsg('User banned successfully.');
      setBanUserId(''); setBanReason('');
      loadData();
    } catch (err) {
      setBanMsg(err.response?.data?.message || 'Ban failed');
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span className="badge badge-amber">Admin</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>Moderation Panel</h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Review flagged sessions, manage users, enforce community standards.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          <TabBtn active={tab === 'flags'} onClick={() => setTab('flags')}>⚑ Flagged Sessions ({flaggedSessions.length})</TabBtn>
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>👥 Users ({users.length})</TabBtn>
          <TabBtn active={tab === 'ban'} onClick={() => setTab('ban')}>🚫 Ban User</TabBtn>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--amber)', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {/* Flagged Sessions tab */}
            {tab === 'flags' && (
              <div className="fade-in">
                {flaggedSessions.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                    <div style={{ color: 'var(--text2)' }}>No flagged sessions. Platform is clean.</div>
                  </div>
                ) : flaggedSessions.map(s => (
                  <div key={s.roomId} className="card" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Room: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)' }}>{s.roomId}</span></div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                          {s.userA?.username || '?'} vs {s.userB?.username || '?'} · {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/report/${s.roomId}`)}>
                        View Report →
                      </button>
                    </div>
                    <div>
                      {s.flags?.map((f, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid #e05c5c20', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: 'var(--red)', fontWeight: 600 }}>{f.category}</span>
                          <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{f.reason}</span>
                          <span style={{ float: 'right', fontSize: 11, color: 'var(--muted)' }}>
                            {new Date(f.timestamp).toLocaleString()} · <span className={`badge ${f.status === 'pending' ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 10 }}>{f.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Show user IDs for banning convenience */}
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                      User A ID: {s.userA?._id} · User B ID: {s.userB?._id}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users tab */}
            {tab === 'users' && (
              <div className="fade-in">
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 70px 70px', padding: '10px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <div>User</div><div style={{ textAlign: 'right' }}>ELO</div><div style={{ textAlign: 'right' }}>Debates</div><div style={{ textAlign: 'right' }}>Wins</div><div style={{ textAlign: 'right' }}>Score</div>
                  </div>
                  {users.map(u => (
                    <div key={u._id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 70px 70px', padding: '12px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{u._id}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{u.eloRating}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{u.totalDebates}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--green)' }}>{u.wins}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{u.avgVocabScore || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ban tab */}
            {tab === 'ban' && (
              <div className="fade-in" style={{ maxWidth: 480 }}>
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--red)' }}>Ban a User</h3>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                    Copy the User ID from the Users tab. Banning immediately locks the account.
                  </p>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>User ID (MongoDB ObjectId)</label>
                    <input className="input" value={banUserId} onChange={e => setBanUserId(e.target.value)} placeholder="64f3a2b1c9d4e5f6a7b8c9d0" />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>Ban Reason</label>
                    <input className="input" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Hate speech, repeated harassment" />
                  </div>
                  {banMsg && (
                    <div style={{ marginBottom: 14, padding: '10px 14px', background: banMsg.includes('success') ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${banMsg.includes('success') ? '#2ecc8740' : '#e05c5c40'}`, borderRadius: 6, fontSize: 13, color: banMsg.includes('success') ? 'var(--green)' : 'var(--red)' }}>
                      {banMsg}
                    </div>
                  )}
                  <button className="btn btn-danger" onClick={handleBan} style={{ width: '100%' }}>🚫 Ban User</button>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
                    This action is immediate. The user will be notified on next login.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}