import { formatDateOnly } from './locale'

// Data senza orario, nel formato del fuso scelto nel profilo (it: 27/11/26, en-US: 11/27/26).
export function formatDate(dateStr: string | null | undefined): string {
  return formatDateOnly(dateStr)
}
