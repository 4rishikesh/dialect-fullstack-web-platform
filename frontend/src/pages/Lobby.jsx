import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';

const TOPICS = ['Technology & AI', 'Climate Change', 'Education Reform', 'Economic Policy', 'Ethics & Philosophy', 'Healthcare', 'Space Exploration', 'Social Media Impact', 'Political Systems', 'General'];
const MODES = [
  { id: 'text', icon: '💬', label: 'Text Debate', desc: 'Turn-based chat with vocabulary coaching' },
  { id: 'voice', icon: '🎤', label: 'Voice Debate', desc: 'Real-time audio via WebRTC' },
  { id: 'video', icon: '📹', label: 'Video Debate', desc: 'Full video stream WebRTC' }
];

export default function Lobby() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('General');
  const [mode, setMode] = useState('text');
  const [queued, setQueued] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('queue:joined', () => {
      setQueued(true); setStatus('Searching for a worthy opponent...');
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    });

    socket.on('match:found', ({ roomId }) => {
      clearInterval(timerRef.current);
      setStatus('Match found! Entering debate room...');
      setTimeout(() => navigate(`/debate/${roomId}`), 800);
    });

    socket.on('error', ({ message }) => {
      setStatus(`Error: ${message}`);
      setQueued(false);
      clearInterval(timerRef.current);
    });

    return () => {
      socket.off('queue:joined');
      socket.off('match:found');
      socket.off('error');
      clearInterval(timerRef.current);
    };
  }, [socket, navigate]);

  // Expand tolerance every 60s
  useEffect(() => {
    if (!queued || elapsed === 0) return;
    if (elapsed % 60 === 0) setStatus(`Expanding search range... (${Math.floor(elapsed / 60)} min)`);
  }, [elapsed, queued]);

  const joinQueue = () => {
    if (!socket) return;
    socket.emit('queue:join', { topic, mode });
  };

  const leaveQueue = () => {
    if (!socket) return;
    socket.emit('queue:leave');
    setQueued(false); setElapsed(0); setStatus('');
    clearInterval(timerRef.current);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1, maxWidth: 700 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Debate Lobby</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Choose your topic and mode. You'll be matched with someone near your ELO ({user?.eloRating}).</p>
        </div>

        {!queued ? (
          <div className="fade-in">
            {/* Mode selector */}
            <h3 style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Debate Mode</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {MODES.map(m => (
                <div key={m.id} onClick={() => setMode(m.id)}
                  style={{
                    padding: '16px 14px', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s',
                    background: mode === m.id ? 'var(--surface3)' : 'var(--surface)',
                    border: `1px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: mode === m.id ? '0 0 0 1px var(--accent-glow)' : 'none'
                  }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Topic selector */}
            <h3 style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Topic</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)}
                  className={`btn btn-sm ${topic === t ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 12 }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Identity reminder */}
            <div style={{ marginBottom: 24, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{user?.mode === 'ghost' ? '👻' : '🌐'}</span>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                You'll appear as <strong style={{ color: 'var(--text)' }}>{user?.mode === 'ghost' ? user?.ghostAlias : user?.username}</strong> ({user?.mode} mode)
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={joinQueue}>
              ⚔ Enter Queue — {topic}
            </button>
          </div>
        ) : (
          <div className="fade-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
            {/* Animated searching indicator */}
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 32px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid var(--border2)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                ⚔
              </div>
            </div>

            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{status}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Mode: <strong style={{ color: 'var(--text)' }}>{mode}</strong> · Topic: <strong style={{ color: 'var(--text)' }}>{topic}</strong>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 500, color: 'var(--accent)', marginBottom: 8 }}>
              {fmt(elapsed)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 32 }}>
              ELO range expands every 60 seconds if no match is found
            </div>

            <button className="btn btn-ghost" onClick={leaveQueue}>
              Cancel Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}