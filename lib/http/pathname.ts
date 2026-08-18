import { headers } from "next/headers";

export async function requestPathname() {
  const headerList = await headers();
  return headerList.get("x-pathname") ?? "";
}
