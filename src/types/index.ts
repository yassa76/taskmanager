export interface OwnerLite {
  id: string
  name: string | null
  email: string
}

export interface SubtaskDTO {
  id: string
  title: string
  description: string | null
  status: 'da_avviare' | 'in_corso' | 'completato'
  startDate: string
  endDate: string | null
  closedAt: string | null
  owner: OwnerLite
  taskId: string
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
  clientId: string | null
  clientName: string | null
  projectName: string | null
  projectId: string | null
  closedManually: boolean
  statusOverride: string | null
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
  activeTasksCount: number
}

export interface TeamMemberDTO {
  id: string
  email: string
  status: 'new' | 'invited' | 'active' | 'inactive'
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
