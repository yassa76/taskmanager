export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/tasks/:path*', '/team/:path*', '/reports/:path*', '/api/tasks/:path*', '/api/subtasks/:path*', '/api/team/:path*', '/api/clients/:path*', '/api/projects/:path*', '/api/reports/:path*']
}
