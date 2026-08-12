const KEY = "psk:lastFinishedMatch";

/**
 * Finishing a match navigates back to the session page, which fetches its data
 * client-side -- so at browser scroll-restoration time the match list isn't in
 * the DOM yet and the page lands at the top. The scoreboard records the match
 * it just finished here so the session page can scroll back to it once the
 * list has actually rendered.
 */
export function rememberFinishedMatch(matchId: string) {
  try {
    sessionStorage.setItem(KEY, matchId);
  } catch {
    // Private-mode / disabled storage: losing the scroll target is harmless.
  }
}

/** Reads and clears the pending target, so it only scrolls once. */
export function takeFinishedMatch(): string | null {
  try {
    const id = sessionStorage.getItem(KEY);
    if (id) sessionStorage.removeItem(KEY);
    return id;
  } catch {
    return null;
  }
}
