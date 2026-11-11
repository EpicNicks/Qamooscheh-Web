// Whether the story reader's main audio is playing right now, readable
// without a render: hover speech (hooks/useHoverSpeech.ts) checks it when its
// dwell timer fires, so a word pointed at mid-story never talks over the
// narration or cuts it off (domain/playback.ts keeps one voice app-wide).
let mainPlaying = false;

export function setMainStoryAudioPlaying(playing: boolean): void {
  mainPlaying = playing;
}

export function isMainStoryAudioPlaying(): boolean {
  return mainPlaying;
}
