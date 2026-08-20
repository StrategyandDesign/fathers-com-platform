export const CATALOG_VISIBLE_ROWS = 3;
export const CATALOG_SCROLL_PEEK = 48;

export function catalogNeedsScroll(count: number, visible = CATALOG_VISIBLE_ROWS) {
  return count > visible;
}

export function catalogScrollMaxHeight(
  rows: Array<{ offsetTop: number; offsetHeight: number }>,
  visible = CATALOG_VISIBLE_ROWS,
  peek = CATALOG_SCROLL_PEEK
) {
  if (rows.length <= visible) return null;
  const last = rows[visible - 1];
  if (!last) return null;
  return last.offsetTop + last.offsetHeight + peek;
}

export function catalogScrollAtEnd(scrollTop: number, clientHeight: number, scrollHeight: number) {
  return scrollTop + clientHeight >= scrollHeight - 4;
}
