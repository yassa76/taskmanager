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
        ;(session.user as any).themeColor = (user as any).themeColor ?? 'blue'
        ;(session.user as any).firstName = (user as any).firstName ?? null
        ;(session.user as any).lastName = (user as any).lastName ?? null
      }
      return session
    }
  },
  events: {
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

      const userCount = await prisma.user.count()
      if (userCount === 1) {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } })
      }
    },

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
