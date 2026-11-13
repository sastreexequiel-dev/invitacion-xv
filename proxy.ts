import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Protege /admin: renueva la sesión de Supabase y redirige al login si
 * no hay usuario o si no figura en la tabla `admins`.
 * (La página del panel y las políticas RLS vuelven a verificarlo.)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/admin/login");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Sin Supabase configurado, el panel muestra instrucciones en /admin/login
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    isAdmin = Boolean(data);
  }

  if (!isLogin && !isAdmin) {
    const to = new URL("/admin/login", request.url);
    if (user) to.searchParams.set("error", "no-admin");
    return NextResponse.redirect(to);
  }
  if (isLogin && isAdmin) return NextResponse.redirect(new URL("/admin", request.url));
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
