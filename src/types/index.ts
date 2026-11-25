export interface OwnerLite {
  id: string
  name: string | null
  email: string
}

export interface SubtaskDTO {
  id: string
  title: string
  description: string | null
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  startDate: string
  endDate: string | null
  closedAt: string | null
  owner: OwnerLite
  createdBy: OwnerLite | null
  taskId: string
  // ricorrenza (null = sub-task singolo)
  recurrence?: string | null
  recurrenceEndDate?: string | null
  recurrenceSourceId?: string | null // sub-task precedente della serie
  recurrenceNextId?: string | null // sub-task successivo, se gia' creato
  createdAt: string
  updatedAt: string
}

export interface SubtaskDetailDTO extends SubtaskDTO {
  task: {
    id: string
    title: string
    clientId: string | null
    clientName: string | null
  }
}

export interface TaskDTO {
  id: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  owner: OwnerLite
  createdBy: OwnerLite | null
  clientId: string | null
  clientName: string | null
  projectName: string | null
  projectId: string | null
  closedManually: boolean
  statusOverride: string | null
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
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
  status: 'attivo' | 'inattivo'
  address: string | null
  country: string | null
  province: string | null
  city: string | null
  owner: OwnerLite | null
  createdBy: OwnerLite | null
  createdAt: string
  projects: { id: string; name: string }[]
  activeTasksCount: number
}

export interface TeamMemberDTO {
  id: string
  email: string
  status: 'new' | 'invited' | 'active' | 'inactive' | 'pending' | 'rejected'
  invitedAt: string
  matchedUser: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string
    image: string | null
    role: string
  } | null
}
