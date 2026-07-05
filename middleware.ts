import { NextRequest, NextResponse } from 'next/server'

export function middleware(_request: NextRequest) {
  // const { pathname } = _request.nextUrl

  // Routes that require authentication
  // const protectedRoutes = ['/dashboard', '/trades', '/analytics', '/settings']
  // const isProtectedRoute = protectedRoutes.some((route) =>
  //   pathname.startsWith(route)
  // )

  // Routes that should redirect to dashboard if already logged in
  // const authRoutes = ['/auth/login', '/auth/signup']
  // const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // For now, skip middleware - client-side auth checks handle this better
  // We'll enhance this later with Supabase session verification
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
