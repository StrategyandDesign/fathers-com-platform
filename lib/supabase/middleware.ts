import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthPath,
  ROLE_HOME,
  resolveProfileRole,
  resolveRole,
  roleForPath,
} from "@/lib/auth/roles";
import { isLocale, isPublicLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { PALETTE_COOKIE, paletteCookieOptions, parsePalette } from "@/lib/theme/palette";

function redirectWithSession(supabaseResponse: NextResponse, url: URL) {
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

function supabasePublicConfig() {
  try {
    return {
      url: getSupabaseUrl(),
      key: getSupabasePublishableKey(),
    };
  } catch {
    return null;
  }
}

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export async function updateSession(request: NextRequest) {
  try {
    return await applySession(request);
  } catch {
    return nextWithPathname(request);
  }
}

async function applySession(request: NextRequest) {
  let supabaseResponse = nextWithPathname(request);

  const config = supabasePublicConfig();
  if (!config) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithPathname(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const requiredRole = roleForPath(pathname);

  if (!user && requiredRole) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectWithSession(supabaseResponse, url);
  }

  let role = user ? resolveRole(user) : null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, locale, home_group_id, color_scheme")
      .eq("id", user.id)
      .maybeSingle();
    role = resolveProfileRole(profile?.role, user);

    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    if (!isLocale(cookieLocale)) {
      let nextLocale: Locale | null = isPublicLocale(profile?.locale) ? profile.locale : null;
      if (!nextLocale) {
        const { data: staffRow } = await supabase
          .from("organization_staff")
          .select("group_id")
          .eq("profile_id", user.id)
          .eq("staff_role", "manager")
          .limit(1)
          .maybeSingle();
        const localeGroupId = staffRow?.group_id;
        if (localeGroupId) {
          const { data: staffGroup } = await supabase
            .from("groups")
            .select("locale")
            .eq("id", localeGroupId)
            .maybeSingle();
          if (isPublicLocale(staffGroup?.locale)) nextLocale = staffGroup.locale;
        }
        if (!nextLocale) {
          const { data: managed } = await supabase
            .from("groups")
            .select("locale")
            .eq("manager_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (isPublicLocale(managed?.locale)) nextLocale = managed.locale;
        }
      }
      if (!nextLocale) {
        const { data: membership } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("father_id", user.id)
          .order("joined_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const groupId = membership?.group_id ?? profile?.home_group_id ?? null;
        if (groupId) {
          const { data: group } = await supabase
            .from("groups")
            .select("locale")
            .eq("id", groupId)
            .maybeSingle();
          if (isPublicLocale(group?.locale)) nextLocale = group.locale;
        }
      }
      if (nextLocale) {
        supabaseResponse.cookies.set(LOCALE_COOKIE, nextLocale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
    }

    const accountPalette = parsePalette(
      (profile as { color_scheme?: unknown } | null)?.color_scheme
    );
    const cookiePalette = parsePalette(request.cookies.get(PALETTE_COOKIE)?.value);
    if (accountPalette && accountPalette !== cookiePalette) {
      supabaseResponse.cookies.set(
        PALETTE_COOKIE,
        accountPalette,
        paletteCookieOptions()
      );
    }
  }

  if (user && role && isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    url.search = "";
    return redirectWithSession(supabaseResponse, url);
  }

  if (user && role && requiredRole) {
    if (role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return redirectWithSession(supabaseResponse, url);
    }
  }

  return supabaseResponse;
}
