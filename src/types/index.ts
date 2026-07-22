export interface OwnerLite {
  id: string
  name: string | null
  email: string
}

export interface SubtaskDTO {
  id: string
  title: string
  status: 'da_avviare' | 'in_corso' | 'completato'
  owner: OwnerLite
  taskId: string
  createdAt: string
  updatedAt: string
}

export interface TaskDTO {
  id: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  owner: OwnerLite
  clientId: string | null
  clientName: string | null
  projectName: string | null
  projectId: string | null
  closedManually: boolean
  status: 'da_avviare' | 'in_corso' | 'completato'
  pendingClosure: boolean
  progress: number
  subtasks: SubtaskDTO[]
  createdAt: string
  updatedAt: string
}

export interface ClientDTO {
  id: string
  name: string
  description: string | null
  industry: string | null
  owner: OwnerLite | null
  projects: { id: string; name: string }[]
}

export interface TeamMemberDTO {
  id: string
  email: string
  name: string | null
  invitedAt: string
  matchedUser: { id: string; name: string | null; email: string; image: string | null } | null
}
