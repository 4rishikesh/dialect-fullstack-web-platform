import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Lobby', path: '/lobby' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'History', path: '/history' },
];

function ConnDot({ connected }) {
  return (
    <div title={connected ? 'Connected' : 'Disconnected'} style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: connected ? 'var(--green)' : 'var(--red)',
      boxShadow: connected ? '0 0 6px var(--green)' : 'none',
    }} />
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={{
      height: 54, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 4,
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
    }}>
      {/* Wordmark */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
          letterSpacing: '0.1em', color: 'var(--text)'
        }}>
          DIAL<span style={{ color: 'var(--accent)' }}>ECT</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              whiteSpace: 'nowrap', transition: 'all 0.15s',
              color: active ? 'var(--text)' : 'var(--text2)',
              background: active ? 'var(--surface2)' : 'transparent',
            }}>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Connection status + user pill */}
        <Link to="/profile" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', background: 'var(--surface2)',
          borderRadius: 8, border: '1px solid var(--border)',
          transition: 'border-color 0.15s',
          borderColor: pathname === '/profile' ? 'var(--border2)' : 'var(--border)'
        }}>
          <ConnDot connected={connected} />
          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
            {user?.mode === 'ghost' ? user?.ghostAlias : user?.username}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--muted)',
            borderLeft: '1px solid var(--border)', paddingLeft: 8
          }}>
            {user?.eloRating} ELO
          </span>
        </Link>

        {/* Mode badge */}
        <span style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
          background: user?.mode === 'ghost' ? 'var(--amber-dim)' : 'var(--green-dim)',
          color: user?.mode === 'ghost' ? 'var(--amber)' : 'var(--green)',
          border: `1px solid ${user?.mode === 'ghost' ? '#d4912a40' : '#2ecc8740'}`,
        }}>
          {user?.mode === 'ghost' ? '👻' : '🌐'}
        </span>

        {/* Admin link */}
        {user?.role === 'admin' && (
          <Link to="/admin" style={{
            fontSize: 11, color: 'var(--amber)', padding: '4px 9px',
            background: 'var(--amber-dim)', borderRadius: 6,
            border: '1px solid #d4912a30', fontWeight: 600,
          }}>
            Admin
          </Link>
        )}

        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
