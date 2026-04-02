import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

function ScoreRing({ value, label, color = 'var(--accent)' }) {
  const r = 38, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={48} y={48} textAnchor="middle" dominantBaseline="central"
          style={{ fill: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{value}</text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SentimentChip({ sentiment }) {
  const map = { positive: ['badge-green', '↑'], 'slightly positive': ['badge-blue', '↗'], neutral: ['badge-amber', '→'], 'slightly negative': ['badge-amber', '↘'], negative: ['badge-red', '↓'] };
  const [cls, icon] = map[sentiment] || ['badge-blue', '—'];
  return <span className={`badge ${cls}`}>{icon} {sentiment}</span>;
}

export default function ReportPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/debate/report/${roomId}`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Report not found'))
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) return (
    <div className="page"><Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    </div>
  );

  if (error) return (
    <div className="page"><Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );

  const { report, side, session } = data;
  const myLex = side === 'A' ? report?.lexicalDiversityA : report?.lexicalDiversityB;
  const myVocab = side === 'A' ? report?.vocabScoreA : report?.vocabScoreB;
  const mySentiment = side === 'A' ? report?.sentimentA : report?.sentimentB;
  const myWeak = side === 'A' ? report?.weakWordsA : report?.weakWordsB;
  const mySuggestions = side === 'A' ? report?.suggestionsA : report?.suggestionsB;
  const mySummary = side === 'A' ? report?.summaryA : report?.summaryB;
  const myEloChange = side === 'A' ? session?.eloChangeA : session?.eloChangeB;

  const won = session?.winner === side;
  const draw = session?.winner === 'draw';

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1, maxWidth: 800 }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div className="fade-in">
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>AI Performance Report</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{session?.topic}</h1>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{session?.mode}</span>
                <span className={`badge ${won ? 'badge-green' : draw ? 'badge-amber' : 'badge-red'}`}>
                  {won ? '🏆 Won' : draw ? '🤝 Draw' : '💭 Lost'}
                </span>
                {myEloChange != null && (
                  <span className={`badge ${myEloChange >= 0 ? 'badge-green' : 'badge-red'}`}>
                    {myEloChange >= 0 ? '+' : ''}{myEloChange} ELO
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/lobby')}>↩ New Debate</button>
        </div>

        {!report ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ color: 'var(--text2)', marginBottom: 8 }}>AI report is being generated...</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>This may take up to a minute for voice/video debates.</div>
          </div>
        ) : (
          <div className="fade-in">

            {/* Score rings */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Your Scores</div>
              <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
                <ScoreRing value={myLex ?? 0} label="Lexical Diversity" color="var(--accent)" />
                <ScoreRing value={Math.min(100, myVocab ?? 0)} label="Vocabulary Score" color="var(--green)" />
              </div>
            </div>

            {/* Summary */}
            {mySummary && (
              <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Summary</div>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{mySummary}</p>
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Tone:</span>
                  <SentimentChip sentiment={mySentiment} />
                </div>
              </div>
            )}

            {/* Weak words + suggestions */}
            {myWeak?.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Vocabulary Coaching</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 8, fontWeight: 600 }}>⚠ Overused Words</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {myWeak.map(w => (
                      <span key={w} style={{ padding: '4px 12px', background: 'var(--amber-dim)', border: '1px solid #d4912a30', borderRadius: 20, fontSize: 12, color: 'var(--amber)' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, fontWeight: 600 }}>💡 Suggestions</div>
                  {mySuggestions?.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid var(--border2)' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison vs opponent */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Head-to-Head</div>
              {[
                { label: 'Lexical Diversity', a: report.lexicalDiversityA, b: report.lexicalDiversityB },
                { label: 'Vocabulary Score', a: Math.min(100, report.vocabScoreA), b: Math.min(100, report.vocabScoreB) }
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                    <span style={{ color: side === 'A' ? 'var(--accent)' : 'var(--text2)' }}>You ({row.a})</span>
                    <span style={{ fontSize: 11 }}>{row.label}</span>
                    <span style={{ color: side === 'B' ? 'var(--accent)' : 'var(--text2)' }}>Opp ({row.b})</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(row.a / (row.a + row.b + 0.01)) * 100}%`, background: 'var(--accent)', transition: 'width 1s ease' }} />
                    <div style={{ flex: 1, background: 'var(--surface3)' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => navigate('/lobby')}>⚔ Debate Again</button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}