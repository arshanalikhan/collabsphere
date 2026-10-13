import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { HOUSES } from '@/lib/houses';
import { updateProfile } from '@/app/actions';

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect('/signin?callbackUrl=/profile');
  const [lng, lat] = me.location?.coordinates || [];
  return (
    <form className="panel form" action={updateProfile}>
      <h1>Your profile</h1>
      {!me.city && <p className="notice">Welcome! Pick your house and city so we can show meetups and peers near you.</p>}
      <p className="muted">{me.points} points earned for {me.house}</p>
      <label>Name<input name="name" defaultValue={me.name} /></label>
      <label>House
        <select name="house" defaultValue={me.house}>{HOUSES.map((h) => <option key={h}>{h}</option>)}</select>
      </label>
      <label>City<input name="city" defaultValue={me.city} /></label>
      <div className="row">
        <label>Latitude<input name="lat" defaultValue={lat} /></label>
        <label>Longitude<input name="lng" defaultValue={lng} /></label>
      </div>
      <p className="muted">Location is rounded to about 1 km. Peers only ever see your city.</p>
      <button>Save</button>
    </form>
  );
}
