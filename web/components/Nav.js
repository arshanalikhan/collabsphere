'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { switchDevUser, signOutAction } from '@/app/actions';

export default function Nav({ me, devUsers }) {
  const path = usePathname();
  const router = useRouter();
  const links = [
    ['/', 'Map'],
    ['/leaderboard', 'Leaderboard'],
    ...(me ? [['/checkin', 'Check in'], ['/profile', 'Profile']] : []),
    ...(me && me.role !== 'member' ? [['/propose', 'Propose']] : []),
    ...(me?.role === 'admin' ? [['/admin', 'Admin']] : []),
  ];
  const isActive = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  const isDevUser = me && devUsers.includes(me.uid);

  return (
    <header className="nav">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden>🌿</span>
        <span><b>CollabSphere</b><small>by Saranda House</small></span>
      </Link>
      <nav aria-label="Main">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-current={isActive(href) ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="nav-right">
        {devUsers.length > 0 && (
          <select aria-label="Demo user" value={isDevUser ? me.uid : ''}
            onChange={async (e) => { await switchDevUser(e.target.value); router.refresh(); }}>
            <option value="">Google account</option>
            {devUsers.map((u) => <option key={u} value={u}>demo: {u}</option>)}
          </select>
        )}
        {me ? (
          <form action={signOutAction} className="who">
            <span className="avatar" aria-hidden>{me.name?.[0]?.toUpperCase() || '?'}</span>
            <span>{me.house} · {me.role}</span>
            <button className="ghost small">Sign out</button>
          </form>
        ) : (
          path !== '/signin' && <Link href="/signin" className="btn signin-link">Sign in</Link>
        )}
      </div>
    </header>
  );
}
