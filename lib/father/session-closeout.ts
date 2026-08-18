import { continueHref, isSessionComplete, type Session, type SessionProgress } from "@/lib/father/types";

export type CloseoutMarkState = "done" | "current" | "next" | "locked";

export type CloseoutMark = {
  id: string;
  number: number;
  title: string;
  state: CloseoutMarkState;
  href: string | null;
};

export type SessionCloseout = {
  finished: Session;
  completed: number;
  total: number;
  remaining: number;
  trainingComplete: boolean;
  next: Session | null;
  nextHref: string | null;
  marks: CloseoutMark[];
};

function sortByCatalog(left: Session, right: Session) {
  return left.session_number - right.session_number || left.order_index - right.order_index;
}

export function catalogSessions(sessions: Session[]) {
  return [...sessions].sort(sortByCatalog);
}

export function nextSessionAfter(
  sessions: Session[],
  finishedId: string,
  completedIds: Iterable<string>
) {
  const done = new Set(completedIds);
  const catalog = catalogSessions(sessions);
  const index = catalog.findIndex((session) => session.id === finishedId);
  const after = index >= 0 ? catalog.slice(index + 1) : catalog;
  return after.find((session) => !done.has(session.id)) ?? null;
}

export function closeoutRemaining(completed: number, total: number) {
  return Math.max(0, total - completed);
}

export function buildCloseoutMarks(input: {
  sessions: Session[];
  finishedId: string;
  completedIds: Iterable<string>;
  nextId?: string | null;
  hrefFor: (session: Session, state: CloseoutMarkState) => string | null;
}): CloseoutMark[] {
  const done = new Set(input.completedIds);
  const catalog = catalogSessions(input.sessions);

  return catalog.map((session) => {
    const complete = done.has(session.id);
    const state: CloseoutMarkState =
      session.id === input.finishedId
        ? "current"
        : complete
          ? "done"
          : session.id === input.nextId
            ? "next"
            : "locked";

    return {
      id: session.id,
      number: session.session_number,
      title: session.title,
      state,
      href: input.hrefFor(session, state),
    };
  });
}

export function buildSessionCloseout(input: {
  finished: Session;
  sessions: Session[];
  progressBySession: Map<string, SessionProgress | null>;
  total: number;
  root?: string;
}): SessionCloseout {
  const catalog = catalogSessions(input.sessions);
  const completedIds = catalog
    .filter((session) => isSessionComplete(input.progressBySession.get(session.id) ?? null))
    .map((session) => session.id);
  const completed = completedIds.length;
  const remaining = closeoutRemaining(completed, input.total);
  const next = nextSessionAfter(catalog, input.finished.id, completedIds);
  const root = input.root ?? "/father";

  const hrefFor = (session: Session, state: CloseoutMarkState) => {
    if (state === "locked") return null;
    if (state === "next") {
      return continueHref(session.id, input.progressBySession.get(session.id) ?? null, { root });
    }
    return `${root}/sessions/${session.id}`;
  };

  return {
    finished: input.finished,
    completed,
    total: input.total,
    remaining,
    trainingComplete: remaining === 0,
    next,
    nextHref: next
      ? continueHref(next.id, input.progressBySession.get(next.id) ?? null, { root })
      : null,
    marks: buildCloseoutMarks({
      sessions: catalog,
      finishedId: input.finished.id,
      completedIds,
      nextId: next?.id ?? null,
      hrefFor,
    }),
  };
}
