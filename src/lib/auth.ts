import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

// La ricerca "utente esistente per email" della libreria di autenticazione è
// sensibile a maiuscole/minuscole di suo: se l'email inserita a mano
// nell'invito team ha una capitalizzazione diversa da quella con cui la
// persona si logga davvero con Google, non trova il match e ne crea uno
// nuovo (perdendo il collegamento a task/sub-task/cliente già assegnati).
// Qui sovrascriviamo quella ricerca specifica per renderla case-insensitive.
const baseAdapter = PrismaAdapter(prisma)
const adapter = {
  ...baseAdapter,
  async getUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  }
}

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,
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
    // Blocca l'accesso a chi e' stato segnato come "Inattivo" nel Team,
    // anche se aveva gia' un account valido.
    async signIn({ user }) {
      if (!user.email) return true
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        include: { teamMember: true }
      })
      if (dbUser?.teamMember?.status === 'inactive') {
        return '/login?error=account_inactive'
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as any).id = user.id
        ;(session.user as any).role = (user as any).role ?? 'normal'
        ;(session.user as any).themeColor = (user as any).themeColor ?? 'blue'
        ;(session.user as any).firstName = (user as any).firstName ?? null
        ;(session.user as any).lastName = (user as any).lastName ?? null
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

      const existingTeamMember = await prisma.teamMember.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } }
      })

      if (existingTeamMember) {
        await prisma.user.update({
          where: { id: user.id },
          data: { teamMemberId: existingTeamMember.id }
        })
      } else {
        const newTeamMember = await prisma.teamMember.create({
          data: { email: user.email.toLowerCase() }
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
    },

    // Si attiva ogni volta che un account Google viene collegato con successo
    // a un utente (sia per una registrazione nuova, sia per un account
    // "segnaposto" gia' invitato in precedenza): e' il momento in cui sappiamo
    // per certo che la persona si e' davvero loggata almeno una volta.
    async linkAccount({ user }) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      if (dbUser?.teamMemberId) {
        await prisma.teamMember.update({
          where: { id: dbUser.teamMemberId },
          data: { status: 'active' }
        })
      }
    }
  }
}
