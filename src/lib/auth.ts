import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Permette di collegare il login Google a un account "segnaposto"
      // gia' creato quando la persona e' stata invitata nel Team, anche
      // se non si e' ancora mai loggata.
      allowDangerousEmailAccountLinking: true
    })
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as any).id = user.id
        ;(session.user as any).role = (user as any).role ?? 'normal'
      }
      return session
    }
  },
  events: {
    // Al primo login/registrazione: prova a fare il match con la lista Team.
    // Se l'email non e' ancora nella lista Team, viene creata automaticamente
    // cosi' compare nella vista Team (utile per il primo utente/admin).
    async createUser({ user }) {
      if (!user.email) return

      const existingTeamMember = await prisma.teamMember.findUnique({
        where: { email: user.email }
      })

      if (existingTeamMember) {
        await prisma.user.update({
          where: { id: user.id },
          data: { teamMemberId: existingTeamMember.id }
        })
      } else {
        const newTeamMember = await prisma.teamMember.create({
          data: { email: user.email, name: user.name ?? undefined }
        })
        await prisma.user.update({
          where: { id: user.id },
          data: { teamMemberId: newTeamMember.id }
        })
      }

      // Il primissimo utente registrato in assoluto diventa admin.
      const userCount = await prisma.user.count()
      if (userCount === 1) {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } })
      }
    }
  }
}
