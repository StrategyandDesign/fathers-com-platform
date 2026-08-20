export function isKeystoneRoomPath(pathname: string) {
  return (
    pathname.startsWith("/father/profile/take") ||
    pathname.startsWith("/father/profile/part") ||
    pathname.startsWith("/father/profile/results") ||
    pathname.startsWith("/manager/practice/profile/take") ||
    pathname.startsWith("/manager/practice/profile/part") ||
    pathname.startsWith("/manager/practice/profile/results")
  );
}
