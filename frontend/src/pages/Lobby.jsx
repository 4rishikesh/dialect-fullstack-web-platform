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
      setQueued(true);
      setStatus('Searching for a worthy opponent...');
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    });

    socket.on('match:found', ({ roomId }) => {
      console.log("MATCH FOUND:", roomId); // ✅ added

      clearInterval(timerRef.current);
      setStatus('Match found! Entering debate room...');

      navigate(`/debate/${roomId}`); // ✅ removed timeout
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

  useEffect(() => {
    if (!queued || elapsed === 0) return;
    if (elapsed % 60 === 0) {
      setStatus(`Expanding search range... (${Math.floor(elapsed / 60)} min)`);
    }
  }, [elapsed, queued]);

  const joinQueue = () => {
    if (!socket) return;

    console.log("JOIN CLICKED", topic, mode); // ✅ added

    socket.emit('queue:join', { topic, mode });
  };

  const leaveQueue = () => {
    if (!socket) return;
    socket.emit('queue:leave');
    setQueued(false);
    setElapsed(0);
    setStatus('');
    clearInterval(timerRef.current);
  };

  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', flex: 1, maxWidth: 700 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            Debate Lobby
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Choose your topic and mode. You'll be matched with someone near your ELO ({user?.eloRating}).
          </p>
        </div>

        {!queued ? (
          <div className="fade-in">

            <h3 style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
              Debate Mode
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {MODES.map(m => (
                <div key={m.id} onClick={() => setMode(m.id)}
                  style={{
                    padding: '16px 14px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background: mode === m.id ? 'var(--surface3)' : 'var(--surface)',
                    border: `1px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`
                  }}>
                  <div style={{ fontSize: 24 }}>{m.icon}</div>
                  <div>{m.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
              Topic
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)}>
                  {t}
                </button>
              ))}
            </div>

            <button onClick={joinQueue}>
              ⚔ Enter Queue — {topic}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2>{status}</h2>
            <p>{fmt(elapsed)}</p>

            <button onClick={leaveQueue}>
              Cancel Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}