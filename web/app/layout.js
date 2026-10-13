import './globals.css';
import { Baloo_2, Nunito, Gochi_Hand } from 'next/font/google';
import Nav from '@/components/Nav';
import { getCurrentUser, toJSON, DEV_USERS, devAuthEnabled } from '@/lib/auth';

// Same type system as the Saranda Build-a-Thon site, self-hosted by next/font (no layout shift)
const display = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const body = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-body' });
const hand = Gochi_Hand({ subsets: ['latin'], weight: '400', variable: '--font-hand' });

export const metadata = {
  title: 'CollabSphere · Saranda House',
  description: 'Cross-house and regional meetup engine for IITM BS houses',
};

export const viewport = { themeColor: '#fff4df' };

export default async function RootLayout({ children }) {
  const me = await getCurrentUser();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${hand.variable}`}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Nav me={me && toJSON(me)} devUsers={devAuthEnabled() ? DEV_USERS : []} />
        <main id="main">{children}</main>
        <footer className="footer">
          <span>CollabSphere · built for the Saranda House Build-a-Thon ’26</span>
          <span className="hand">nine houses, one shared drive 🌿</span>
        </footer>
      </body>
    </html>
  );
}
