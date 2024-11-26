// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const path = req.nextUrl.pathname;
  const role = userData?.role;

  // Protect routes based on role
  if (path.startsWith('/dashboard/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (path.startsWith('/dashboard/editor') && role !== 'editor') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (path.startsWith('/dashboard/writer') && role !== 'writer') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (path.startsWith('/dashboard/employer') && role !== 'employer') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: '/dashboard/:path*',
};
