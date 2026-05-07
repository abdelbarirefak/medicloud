import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes — always accessible
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/offline'];
  const publicApiPrefixes = ['/api/search', '/api/public', '/api/cron', '/api/auth'];

  if (publicRoutes.includes(path)) {
    // If user is logged in and tries to access login/register, redirect to dashboard
    if (user && (path === '/login' || path === '/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role || 'patient';
      return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
    return supabaseResponse;
  }

  // API routes — only explicitly listed prefixes are public
  if (path.startsWith('/api/')) {
    const isPublicApi = publicApiPrefixes.some((p) => path.startsWith(p));
    if (isPublicApi) return supabaseResponse;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return supabaseResponse;
  }

  // Protected routes — require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route guards
  // Priority: read from the JWT metadata to save a DB query and avoid race conditions
  let role = user?.user_metadata?.role;
  let isActive = true;

  // Fallback to database if missing (or to check is_active robustly)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile) {
    role = profile.role;
    isActive = profile.is_active ?? true;
  } else if (!role) {
    role = 'patient';
  }

  // Let deactivated accessible if they are blocked
  if (path === '/deactivated') {
    if (isActive) return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    return supabaseResponse;
  }

  if (!isActive) {
    return NextResponse.redirect(new URL('/deactivated', request.url));
  }

  // Check doctor verification
  if (role === 'doctor') {
    if (path.startsWith('/doctor') && path !== '/doctor/pending') {
      const { data: doctor } = await supabase.from('doctors').select('is_verified').eq('user_id', user.id).single();
      if (doctor && !doctor.is_verified) {
        return NextResponse.redirect(new URL('/doctor/pending', request.url));
      }
    }
  }

  if (path.startsWith('/patient') && role !== 'patient') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }
  if (path.startsWith('/doctor') && role !== 'doctor') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }
  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
