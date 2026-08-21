import { cookies } from "next/headers";

import {
  HOME_DESK_COOKIE,
  homeDeskCookieOptions,
  parseHomeDeskVisit,
} from "@/lib/father/home-desk";

export async function readHomeDeskVisit() {
  const jar = await cookies();
  return parseHomeDeskVisit(jar.get(HOME_DESK_COOKIE)?.value);
}

export async function clearHomeDeskCookie() {
  const jar = await cookies();
  jar.set(HOME_DESK_COOKIE, "", { ...homeDeskCookieOptions(), maxAge: 0 });
}
