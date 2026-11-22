/** The topic Repack route (LessonPage's lesson-less remix): the chosen topics, plus Rough spots when ticked. */
export function repackUrl(themeIds: readonly string[], rough: boolean): string {
  const params = [`themeIds=${themeIds.map(encodeURIComponent).join(",")}`];
  if (rough) params.push("rough=1");
  return `/lesson/deep-dive-remix?${params.join("&")}`;
}

/** The sidebar's Review: a Repack of Rough spots alone. */
export const REVIEW_URL = repackUrl([], true);
