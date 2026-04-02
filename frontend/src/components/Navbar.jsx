import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Lobby', path: '/lobby' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'History', path: '/history' }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={{
      height: 54, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0
    }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text)' }}>
          DIAL<span style={{ color: 'var(--accent)' }}>ECT</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.path} to={item.path} style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            color: pathname.startsWith(item.path) ? 'var(--text)' : 'var(--text2)',
            background: pathname.startsWith(item.path) ? 'var(--surface2)' : 'transparent',
            transition: 'all 0.15s'
          }}>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: user?.mode === 'ghost' ? 'var(--text2)' : 'var(--green)', fontWeight: 600 }}>
            {user?.mode === 'ghost' ? '👻' : '🌐'} {user?.mode === 'ghost' ? user?.ghostAlias : user?.username}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
            {user?.eloRating} ELO
          </span>
        </div>

        {user?.role === 'admin' && (
          <Link to="/admin" style={{ fontSize: 12, color: 'var(--amber)', padding: '4px 10px', background: 'var(--amber-dim)', borderRadius: 6, border: '1px solid #d4912a30' }}>
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