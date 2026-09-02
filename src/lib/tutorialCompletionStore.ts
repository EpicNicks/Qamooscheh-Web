// Local-only placeholder for "has this learner completed (or skipped) the
// onboarding tutorial". THIS IS NOT THE FINAL DESIGN: this is meant to
// become a real account-level flag (an onboarding-complete-shaped column,
// synced the way app_user.active_course_code is), so it follows a learner
// across devices — kept local for now, isolated behind
// hooks/useTutorialCompletion.ts's interface, the same stand-in pattern
// lib/starredLexemeStore.ts used before GET/PUT /v1/vocab/starred existed.
function storageKey(userId: string): string {
  return `qamooscheh.tutorialCompleted.${userId}`;
}

export function loadTutorialCompleted(userId: string): boolean {
  return localStorage.getItem(storageKey(userId)) === "true";
}

export function saveTutorialCompleted(userId: string): void {
  localStorage.setItem(storageKey(userId), "true");
}
