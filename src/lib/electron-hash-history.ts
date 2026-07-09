import type { HistoryLocation, RouterHistory } from "@tanstack/react-router";

type SubscriberArgs = Parameters<RouterHistory["subscribe"]>[0] extends (args: infer Args) => void ? Args : never;
type Subscriber = (args: SubscriberArgs) => void;
type NavigationBlocker = Parameters<RouterHistory["block"]>[0];

const stateIndexKey = "__TSR_index";

function createKey() {
  return (Math.random() + 1).toString(36).substring(7);
}

function normalizePath(path: string) {
  const next = path || "/";
  return next.startsWith("/") ? next : `/${next}`;
}

function pathFromHash() {
  const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return normalizePath(rawHash || "/");
}

function parsePath(path: string, state: HistoryLocation["state"]): HistoryLocation {
  const normalized = normalizePath(path);
  const hashIndex = normalized.indexOf("#");
  const searchIndex = normalized.indexOf("?");
  const pathnameEnd =
    hashIndex > 0
      ? searchIndex > 0
        ? Math.min(hashIndex, searchIndex)
        : hashIndex
      : searchIndex > 0
        ? searchIndex
        : normalized.length;

  return {
    href: normalized,
    pathname: normalized.substring(0, pathnameEnd),
    search: searchIndex > -1 ? normalized.slice(searchIndex, hashIndex === -1 ? undefined : hashIndex) : "",
    hash: hashIndex > -1 ? normalized.substring(hashIndex) : "",
    state,
  };
}

function makeState(index: number, state?: Partial<HistoryLocation["state"]>): HistoryLocation["state"] {
  const key = state?.__TSR_key ?? state?.key ?? createKey();
  return { ...state, [stateIndexKey]: index, key, __TSR_key: key } as HistoryLocation["state"];
}

export function createElectronHashHistory(): RouterHistory {
  let index = 0;
  let currentState = makeState(index, window.history.state ?? undefined);
  let currentLocation = parsePath(pathFromHash(), currentState);
  let ignoreNextHashChange = false;
  const subscribers = new Set<Subscriber>();
  let blockers: NavigationBlocker[] = [];

  const notify: RouterHistory["notify"] = (action) => {
    currentLocation = parsePath(pathFromHash(), currentState);
    subscribers.forEach((subscriber) => subscriber({ location: currentLocation, action } as SubscriberArgs));
  };

  const setHash = (path: string, state: HistoryLocation["state"], action: "PUSH" | "REPLACE") => {
    currentState = state;
    const normalized = normalizePath(path);
    const nextHash = `#${normalized}`;

    if (window.location.hash !== nextHash) {
      ignoreNextHashChange = true;
      if (action === "REPLACE") {
        window.location.replace(nextHash);
      } else {
        window.location.hash = normalized;
      }
    }

    currentLocation = parsePath(normalized, currentState);

    // Electron runs this app from file://. TanStack's normal SPA transition can
    // leave the packaged renderer wedged after route changes that also update
    // persisted project state. A real hash-page reload is slower, but it is the
    // smallest Electron-only change that makes packaged routing deterministic.
    window.setTimeout(() => window.location.reload(), 0);
  };

  const onHashChange = () => {
    if (ignoreNextHashChange) {
      ignoreNextHashChange = false;
      return;
    }
    index += 1;
    currentState = makeState(index);
    notify({ type: "GO", index: 0 });
  };

  window.addEventListener("hashchange", onHashChange);

  return {
    get location() {
      return currentLocation;
    },
    get length() {
      return window.history.length;
    },
    subscribers,
    subscribe: (cb) => {
      subscribers.add(cb as Subscriber);
      return () => subscribers.delete(cb as Subscriber);
    },
    push: (path, state) => {
      index += 1;
      setHash(path, makeState(index, state), "PUSH");
    },
    replace: (path, state) => {
      setHash(path, makeState(index, state), "REPLACE");
    },
    go: (delta) => window.history.go(delta),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    canGoBack: () => index > 0 || window.history.length > 1,
    createHref: (href) => `#${normalizePath(href)}`,
    block: (blocker) => {
      blockers = [...blockers, blocker];
      return () => {
        blockers = blockers.filter((item) => item !== blocker);
      };
    },
    flush: () => undefined,
    destroy: () => window.removeEventListener("hashchange", onHashChange),
    notify,
  };
}