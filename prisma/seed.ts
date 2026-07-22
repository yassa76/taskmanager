import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Aggiungi qui le email del tuo team: chi fa login con Google con una di
  // queste email viene automaticamente riconosciuto e collegato.
  const teamEmails = [
    { email: 'mario.rossi@tuaazienda.com', name: 'Mario Rossi' },
    { email: 'giulia.bianchi@tuaazienda.com', name: 'Giulia Bianchi' }
  ]

  for (const t of teamEmails) {
    await prisma.teamMember.upsert({
      where: { email: t.email },
      update: {},
      create: t
    })
  }

  const client = await prisma.client.upsert({
    where: { name: 'Cliente Demo' },
    update: {},
    create: { name: 'Cliente Demo' }
  })

  await prisma.project.upsert({
    where: { clientId_name: { clientId: client.id, name: 'Progetto Demo' } },
    update: {},
    create: { name: 'Progetto Demo', clientId: client.id }
  })

  console.log('Seed completato.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
