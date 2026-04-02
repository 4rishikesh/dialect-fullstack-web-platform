import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';

// ─── Weak word detector (client-side hints) ───────────────────────────
const WEAK = new Set(['good','bad','nice','big','small','very','really','just','many','few','thing','stuff','get','make','like','ok','okay','fine','great','cool','awesome','terrible','horrible']);
const ALTS = { good:'exemplary', bad:'detrimental', nice:'laudable', big:'substantial', small:'negligible', very:'considerably', really:'genuinely', just:'merely', many:'numerous', few:'scant', thing:'element', stuff:'substance', get:'obtain', make:'formulate', like:'analogous to', great:'outstanding', cool:'innovative', awesome:'extraordinary', terrible:'deplorable', horrible:'atrocious', okay:'acceptable', fine:'adequate' };

function analyzeText(text) {
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const weak = [...new Set(words.filter(w => WEAK.has(w)))];
  return weak.slice(0, 3).map(w => ({ word: w, alt: ALTS[w] || 'a stronger synonym' }));
}

// ─── Sub-components ───────────────────────────────────────────────────
function TimerBar({ remaining, total = 120 }) {
  const pct = Math.max(0, (remaining / total) * 100);
  const color = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
        <span>Turn timer</span>
        <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>
          {String(Math.floor(remaining / 60)).padStart(2,'0')}:{String(remaining % 60).padStart(2,'0')}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 1s linear, background 0.3s' }} />
      </div>
    </div>
  );
}

function ChatBubble({ msg, isOwn }) {
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12, animation: 'slideIn 0.2s ease' }}>
      <div style={{ maxWidth: '78%' }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, textAlign: isOwn ? 'right' : 'left' }}>
          {msg.alias} · Rnd {msg.round}
          {msg.filtered && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>⚠ filtered</span>}
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: isOwn ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isOwn ? 'var(--accent)' : 'var(--surface2)',
          border: `1px solid ${isOwn ? 'var(--accent2)' : 'var(--border)'}`,
          fontSize: 14, lineHeight: 1.55, color: 'var(--text)'
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function VideoPanel({ localRef, remoteRef, aliasA, aliasB, muted, onToggleMute, videoOn, onToggleVideo }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {[{ ref: localRef, label: 'You', local: true }, { ref: remoteRef, label: 'Opponent', local: false }].map(({ ref, label, local }) => (
        <div key={label} style={{ flex: 1, borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)', border: '1px solid var(--border)', aspectRatio: '4/3', position: 'relative' }}>
          <video ref={ref} autoPlay playsInline muted={local} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 10 }}>{label}</div>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onToggleMute} title="Toggle mic">
          {muted ? '🔇' : '🎤'}
        </button>
        {videoOn !== undefined && (
          <button className="btn btn-ghost btn-sm" onClick={onToggleVideo} title="Toggle camera">
            {videoOn ? '📹' : '📷'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main DebateRoom ──────────────────────────────────────────────────
export default function DebateRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('waiting'); // waiting | countdown | active | ended
  const [side, setSide] = useState(null); // 'A' | 'B'
  const [meta, setMeta] = useState({ topic: '', mode: 'text', aliasA: '', aliasB: '', maxRounds: 5 });
  const [turn, setTurn] = useState('A');
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(120);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [hints, setHints] = useState([]);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [opponentGone, setOpponentGone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const chatEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const { startCall, cleanup, toggleMute, toggleVideo } = useWebRTC({
    socket, roomId,
    mode: meta.mode,
    isInitiator: side === 'A',
    localVideoRef, remoteVideoRef, localAudioRef, remoteAudioRef
  });

  const isMyTurn = turn === side;

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;
    socket.emit('room:join', { roomId });

    socket.on('debate:started', (data) => {
      setMeta({ topic: data.topic, mode: data.mode, aliasA: data.aliasA, aliasB: data.aliasB, maxRounds: data.maxRounds });
      setTurn(data.firstTurn); setRemaining(data.turnDuration);
      let c = 3;
      setCountdown(c); setPhase('countdown');
      const iv = setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearInterval(iv); setPhase('active'); } }, 1000);
      if (data.mode === 'voice' || data.mode === 'video') setTimeout(() => startCall(), 3500);
    });

    socket.on('match:found', ({ side: s }) => setSide(s));

    socket.on('debate:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('debate:turn_change', ({ turn: t, round: r }) => {
      setTurn(t); setRound(r); setHints([]);
    });

    socket.on('debate:timer', ({ remaining: rem }) => setRemaining(rem));

    socket.on('debate:ended', (data) => {
      setResult(data); setPhase('ended'); cleanup();
    });

    socket.on('debate:opponent_disconnected', ({ timeout }) => {
      setOpponentGone(true);
    });

    socket.on('debate:opponent_reconnected', () => setOpponentGone(false));

    socket.on('flag:confirmed', () => { setFlagOpen(false); setFlagReason(''); });

    return () => {
      socket.off('debate:started');
      socket.off('match:found');
      socket.off('debate:message');
      socket.off('debate:turn_change');
      socket.off('debate:timer');
      socket.off('debate:ended');
      socket.off('debate:opponent_disconnected');
      socket.off('debate:opponent_reconnected');
      socket.off('flag:confirmed');
      cleanup();
    };
  }, [socket, roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!draft.trim() || !isMyTurn || phase !== 'active') return;
    socket.emit('debate:send_message', { roomId, content: draft.trim() });
    setDraft(''); setHints([]);
  };

  const onDraftChange = (e) => {
    setDraft(e.target.value);
    setHints(analyzeText(e.target.value));
  };

  const handleForfeit = () => {
    if (window.confirm('Are you sure you want to forfeit? Your opponent wins.')) {
      socket.emit('debate:forfeit', { roomId });
    }
  };

  const submitFlag = () => {
    if (!flagReason) return;
    socket.emit('debate:flag', { roomId, reason: flagReason, category: 'User Report' });
  };

  // ── WAITING phase ──
  if (phase === 'waiting') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div className="spin" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)' }}>Connecting to debate room...</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Room: {roomId}</div>
    </div>
  );

  // ── COUNTDOWN phase ──
  if (phase === 'countdown') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Debate starting in
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{countdown}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Topic: <strong style={{ color: 'var(--text)' }}>{meta.topic}</strong></div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>You are <strong style={{ color: 'var(--accent)' }}>Debater {side}</strong></div>
    </div>
  );

  // ── ENDED phase ──
  if (phase === 'ended' && result) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div className="card fade-in" style={{ textAlign: 'center', padding: '40px 32px', marginBottom: 16 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>
            {result.winner === side ? '🏆' : result.winner === 'draw' ? '🤝' : '💭'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            {result.winner === side ? 'You Won!' : result.winner === 'draw' ? 'Draw' : 'Debate Ended'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Topic: {meta.topic}</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>ELO Change</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: side === 'A' ? (result.eloChangeA >= 0 ? 'var(--green)' : 'var(--red)') : (result.eloChangeB >= 0 ? 'var(--green)' : 'var(--red)') }}>
                {side === 'A' ? (result.eloChangeA >= 0 ? '+' : '') + result.eloChangeA : (result.eloChangeB >= 0 ? '+' : '') + result.eloChangeB}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>New ELO</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--text)' }}>
                {side === 'A' ? result.newEloA : result.newEloB}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/report/${roomId}`)}>View AI Report</button>
            <button className="btn btn-ghost" onClick={() => navigate('/lobby')}>Debate Again</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ACTIVE phase ──
  const myAlias = side === 'A' ? meta.aliasA : meta.aliasB;
  const oppAlias = side === 'A' ? meta.aliasB : meta.aliasA;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', marginRight: 8 }}>
          DIAL<span style={{ color: 'var(--accent)' }}>ECT</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-blue">{meta.mode}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{meta.topic}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Round {round} / {meta.maxRounds}</span>
        <span style={{ fontSize: 12, color: turn === side ? 'var(--green)' : 'var(--muted)', fontWeight: 600 }}>
          {turn === side ? '● Your Turn' : `● ${oppAlias}'s Turn`}
        </span>
        {opponentGone && <span className="badge badge-amber">Opponent disconnected...</span>}
        <button className="btn btn-ghost btn-sm" onClick={() => setFlagOpen(!flagOpen)} title="Report">⚑</button>
        <button className="btn btn-danger btn-sm" onClick={handleForfeit}>Forfeit</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Chat / main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Video panels for voice/video mode */}
          {(meta.mode === 'voice' || meta.mode === 'video') && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              {meta.mode === 'video' ? (
                <VideoPanel
                  localRef={localVideoRef} remoteRef={remoteVideoRef}
                  aliasA={myAlias} aliasB={oppAlias}
                  muted={muted} onToggleMute={() => { const en = toggleMute(); setMuted(!en); }}
                  videoOn={videoOn} onToggleVideo={() => { const en = toggleVideo(); setVideoOn(en); }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <audio ref={localAudioRef} autoPlay muted />
                  <audio ref={remoteAudioRef} autoPlay />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s ease infinite' }} />
                      <span style={{ fontSize: 12 }}>🎤 {myAlias}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>↔</div>
                    <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s ease infinite 0.5s' }} />
                      <span style={{ fontSize: 12 }}>🎤 {oppAlias}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { const en = toggleMute(); setMuted(!en); }}>
                      {muted ? '🔇 Unmute' : '🎤 Mute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                The debate has begun. {turn === side ? 'You go first!' : `${oppAlias} goes first.`}
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} isOwn={msg.alias === myAlias} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Timer + Input */}
          <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <TimerBar remaining={remaining} total={120} />

            {/* Vocab hints */}
            {hints.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {hints.map((h, i) => (
                  <div key={i} style={{ fontSize: 11, padding: '3px 10px', background: 'var(--amber-dim)', border: '1px solid #d4912a30', borderRadius: 10, color: 'var(--amber)' }}>
                    💡 Try <strong>{h.alt}</strong> instead of "{h.word}"
                  </div>
                ))}
              </div>
            )}

            {meta.mode === 'text' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <textarea
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isMyTurn ? 'Type your argument... (Enter to send)' : `Waiting for ${oppAlias}...`}
                  disabled={!isMyTurn || phase !== 'active'}
                  maxLength={1000}
                  rows={3}
                  style={{
                    flex: 1, background: 'var(--surface2)', border: `1px solid ${isMyTurn ? 'var(--border2)' : 'var(--border)'}`,
                    borderRadius: 8, color: 'var(--text)', padding: '10px 14px', resize: 'none',
                    fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5,
                    opacity: isMyTurn ? 1 : 0.5
                  }}
                />
                <button className="btn btn-primary" onClick={sendMessage} disabled={!isMyTurn || !draft.trim() || phase !== 'active'}
                  style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>
                  Send →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: 13, color: 'var(--text2)' }}>
                {meta.mode === 'voice' ? '🎤 Audio debate in progress' : '📹 Video debate in progress'}
                {isMyTurn ? ' — Your turn to speak' : ` — ${oppAlias} is speaking`}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{draft.length}/1000</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Shift+Enter for newline</span>
            </div>
          </div>
        </div>

        {/* Side info panel */}
        <div style={{ width: 220, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: 16, gap: 16, overflowY: 'auto', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Participants</div>
            {[{ alias: meta.aliasA, label: 'A', active: turn === 'A' }, { alias: meta.aliasB, label: 'B', active: turn === 'B' }].map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: p.active ? 'var(--accent-glow)' : 'var(--surface2)', borderRadius: 6, border: `1px solid ${p.active ? 'var(--accent)' : 'var(--border)'}`, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.active ? 'var(--accent)' : 'var(--dim)' }} />
                <span style={{ fontSize: 12, fontWeight: p.active ? 600 : 400, flex: 1 }}>{p.alias}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{p.label}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Rounds</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Array.from({ length: meta.maxRounds }, (_, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, background: i + 1 < round ? 'var(--surface3)' : i + 1 === round ? 'var(--accent)' : 'var(--surface2)', color: i + 1 === round ? '#fff' : i + 1 < round ? 'var(--muted)' : 'var(--dim)', border: `1px solid ${i + 1 === round ? 'var(--accent2)' : 'var(--border)'}` }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Messages</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{messages.length}</div>
          </div>
        </div>
      </div>

      {/* Flag modal */}
      {flagOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 360, padding: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Report Opponent</h3>
            {['Hate Speech', 'Harassment', 'Profanity Bypass', 'Scripted Responses', 'Other'].map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="flag" value={cat} onChange={() => setFlagReason(cat)} style={{ accentColor: 'var(--accent)' }} />
                {cat}
              </label>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={submitFlag} disabled={!flagReason}>Submit Report</button>
              <button className="btn btn-ghost" onClick={() => setFlagOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}