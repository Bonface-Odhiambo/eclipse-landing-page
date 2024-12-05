// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // Check auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Get user role from user_roles table
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleError || !userRole) {
      console.error('Role error:', roleError);
      return NextResponse.redirect(new URL('/', req.url));
    }

    const path = req.nextUrl.pathname;
    const role = userRole.role;

    // Check if the requested path matches the user's role
    if (path.startsWith('/dashboard/')) {
      const requestedRole = path.split('/')[2]; // Get role from URL
      
      if (requestedRole !== role) {
        // Redirect to their correct dashboard
        return NextResponse.redirect(new URL(`/dashboard/${role}`, req.url));
      }
    }

    return res;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};