import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { HOUSES } from '@/lib/houses';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'House leaderboard' };

export default async function LeaderboardPage() {
  await connectDB();
  const [agg, top] = await Promise.all([
    User.aggregate([{ $group: { _id: '$house', points: { $sum: '$points' }, members: { $sum: 1 } } }]),
    User.find({ points: { $gt: 0 } }).sort({ points: -1, name: 1 }).limit(5).select('name house points'),
  ]);
  const byHouse = Object.fromEntries(agg.map((r) => [r._id, r]));
  const rows = HOUSES.map((h) => ({ house: h, points: byHouse[h]?.points || 0, members: byHouse[h]?.members || 0 }))
    .sort((a, b) => b.points - a.points);
  const max = Math.max(1, ...rows.map((r) => r.points));

  return (
    <div className="stack">
      <section className="panel accent-top" style={{ '--accent-color': 'var(--sun)' }}>
        <span className="hand">points earned by showing up</span>
        <h1>House leaderboard</h1>
        <ol className="board">
          {rows.map((r, i) => (
            <li key={r.house}>
              <span className="rank" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
              <b>{r.house}</b>
              <span className="bar" style={{ '--w': `${(r.points / max) * 100}%` }} aria-hidden />
              <span className="pts">{r.points} pts · {r.members} {r.members === 1 ? 'member' : 'members'}</span>
            </li>
          ))}
        </ol>
      </section>
      {top.length > 0 && (
        <section className="panel">
          <h2>Top members</h2>
          <ol className="board compact">
            {top.map((u, i) => (
              <li key={u._id}>
                <span className="rank" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
                <b>{u.name}</b>
                <span className="muted">{u.house}</span>
                <span className="pts">{u.points} pts</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
