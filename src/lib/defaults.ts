import { prisma } from './prisma'

// Profilo e ruolo assegnati ai nuovi utenti. Si scelgono in Admin (profilo e ruolo "predefinito");
// valori salvati in AppSetting, nessuna tabella dedicata.
const PROFILE_KEY = 'defaults.profile'
const ORGROLE_KEY = 'defaults.orgRole'

async function read(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } }).catch(() => null)
  return row?.value || null
}

async function write(key: string, value: string | null) {
  if (value === null) {
    await prisma.appSetting.deleteMany({ where: { key } })
    return
  }
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

// Chiave del profilo predefinito: se non impostato (o non piu' valido) e' "normal". Mai "admin".
export async function getDefaultProfileKey(): Promise<string> {
  const key = await read(PROFILE_KEY)
  if (!key || key === 'admin') return 'normal'
  if (['normal', 'read_only'].includes(key)) return key
  const exists = await prisma.role.findUnique({ where: { key } }).catch(() => null)
  return exists ? key : 'normal'
}

// Id del ruolo aziendale predefinito, oppure null (nessun ruolo: vede tutto, come prima).
export async function getDefaultOrgRoleId(): Promise<string | null> {
  const id = await read(ORGROLE_KEY)
  if (!id) return null
  const exists = await prisma.orgRole.findUnique({ where: { id } }).catch(() => null)
  return exists ? id : null
}

export async function setDefaultProfileKey(key: string | null) {
  await write(PROFILE_KEY, key)
}

export async function setDefaultOrgRoleId(id: string | null) {
  await write(ORGROLE_KEY, id)
}

// Dati da assegnare a un utente appena creato.
export async function newUserDefaults(): Promise<{ role: string; orgRoleId: string | null }> {
  return { role: await getDefaultProfileKey(), orgRoleId: await getDefaultOrgRoleId() }
}
