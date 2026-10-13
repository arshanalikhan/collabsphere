import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

const csv = (v) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const allowedDomains = csv(process.env.ALLOWED_EMAIL_DOMAINS);
const adminEmails = csv(process.env.ADMIN_EMAILS);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin', error: '/signin' },
  callbacks: {
    // Restrict to student domains and create/link the house profile on first sign-in
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || !profile.email_verified) return false;
      const domainOk = !allowedDomains.length || allowedDomains.includes(email.split('@')[1]);
      if (!domainOk && !adminEmails.includes(email)) return '/signin?error=domain';

      await connectDB();
      const uid = `google:${profile.sub}`;
      const user = await User.findOneAndUpdate(
        { uid },
        { $set: { email, name: profile.name }, $setOnInsert: { uid } },
        { upsert: true, new: true },
      );
      // Bootstrap admins from env so the first organisers don't need a DB edit
      if (adminEmails.includes(email) && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) token.uid = `google:${profile.sub}`;
      return token;
    },
    async session({ session, token }) {
      session.user.uid = token.uid;
      return session;
    },
  },
});
