import { redirect } from 'next/navigation'

// Le notifiche stanno nel profilo (tab Notifiche): questo indirizzo resta per i vecchi collegamenti.
export default function NotificationsPage() {
  redirect('/profile?tab=notifiche')
}
