import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import { runCleanupIfDue } from './retention'
import { getRolePermissions } from './rolePermissions'
import { ensureAdminExists } from './admins'
import { getVisibility, canSeeTeam } from './visibility'
import { notifyAdminsAccessRequest } from './notify'

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
    // Controlla chi puo' entrare:
    // - "Inattivo" nel Team: bloccato, anche se aveva gia' un account.
    // - Persona sconosciuta (mai invitata, mai vista): non entra; si registra una richiesta di accesso
    //   ("In attesa") e gli admin vengono avvisati. Solo il primissimo utente entra subito (diventa admin).
    // - "In attesa" / "Rifiutato": bloccato finche' un admin non cambia lo stato.
    async signIn({ user }) {
      await ensureAdminExists().catch(() => {})
      if (!user.email) return true
      const email = user.email
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { teamMember: true }
      })
      const member =
        dbUser?.teamMember ??
        (await prisma.teamMember.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }))

      if (member?.status === 'inactive') return '/login?error=account_inactive'
      if (member?.status === 'pending') return '/login?error=pending_approval'
      if (member?.status === 'rejected') return '/login?error=access_denied'

      if (!dbUser && !member && (await prisma.user.count()) > 0) {
        const created = await prisma.teamMember.create({ data: { email: email.toLowerCase(), status: 'pending' } })
        await notifyAdminsAccessRequest(created.id, user.name || email)
        return '/login?error=pending_approval'
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as any).id = user.id
        const roleKey = (user as any).role ?? 'normal'
        ;(session.user as any).role = roleKey
        ;(session.user as any).permissions = await getRolePermissions(roleKey)
        // se la persona vede anche record di altri: serve per mostrare l'interruttore "I miei / Tutto il team"
        ;(session.user as any).canSeeTeam = canSeeTeam(await getVisibility({ user: { id: user.id, role: roleKey } }))
        ;(session.user as any).themeColor = (user as any).themeColor ?? 'blue'
        ;(session.user as any).firstName = (user as any).firstName ?? null
        ;(session.user as any).lastName = (user as any).lastName ?? null
      }
      return session
    }
  },
  events: {
    // Ogni login riuscito: lo registra per l'elenco accessi (solo utente e orario) e
    // approfitta per la pulizia periodica dei registri vecchi.
    async signIn({ user }) {
      try {
        if (!user?.id) return
        const now = new Date()
        await prisma.accessLog.create({ data: { userId: user.id, createdAt: now } })
        await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: now } })
        await runCleanupIfDue()
      } catch (e) {
        console.error('Registrazione accesso non riuscita', e)
      }
    },

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
