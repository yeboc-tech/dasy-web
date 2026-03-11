import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()

  // 루트 경로: 로그인 여부에 따라 분기
  const pathname = request.nextUrl.pathname
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/my/dashboard' : '/landing'
    return NextResponse.redirect(url)
  }

  // 랜딩 페이지: 로그인 된 상태면 대시보드로
  if (pathname === '/landing' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/my/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}