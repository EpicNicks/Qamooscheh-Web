import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { play, SLOW_RATE } from "./playback";

// Stand-ins for the two browser APIs playback drives: an <audio> element that
// a test can end or fail, and a speech engine that records what it was asked.
class FakeAudio {
  static instances: FakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = false;
  playbackRate = 1;
  src: string;
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

let spoken: string[];
let spokenRates: number[];
let cancels: number;

beforeEach(() => {
  FakeAudio.instances = [];
  spoken = [];
  spokenRates = [];
  cancels = 0;
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("window", {
    speechSynthesis: {
      speak: (u: { text: string; rate: number }) => {
        spoken.push(u.text);
        spokenRates.push(u.rate);
      },
      cancel: () => cancels++,
      getVoices: () => [],
    },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      rate = 1;
      voice = null;
      onend = null;
      onerror = null;
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("play", () => {
  it("plays slowed at the requested rate, recording or text-to-speech (issue #36)", () => {
    play({ url: "https://cdn/a.mp3", text: "سلام", speechLang: "fa-IR", rate: SLOW_RATE });
    expect(FakeAudio.instances[0].playbackRate).toBe(SLOW_RATE);
    play({ url: null, text: "سلام", speechLang: "fa-IR", rate: SLOW_RATE });
    expect(spokenRates).toEqual([SLOW_RATE]);
    play({ url: null, text: "سلام", speechLang: "fa-IR" });
    expect(spokenRates).toEqual([SLOW_RATE, 1]);
  });

  it("plays the recording when there is one", () => {
    play({ url: "https://cdn/a.mp3", text: "سلام", speechLang: "fa-IR" });
    expect(FakeAudio.instances.map((a) => a.src)).toEqual(["https://cdn/a.mp3"]);
    expect(spoken).toEqual([]);
  });

  it("reads the text aloud when there's no recording", () => {
    play({ url: null, text: "سلام", speechLang: "fa-IR" });
    expect(spoken).toEqual(["سلام"]);
  });

  it("falls back to reading aloud when the recording fails to load", () => {
    play({ url: "https://cdn/missing.mp3", text: "سلام", speechLang: "fa-IR" });
    FakeAudio.instances[0].onerror!();
    expect(spoken).toEqual(["سلام"]);
  });

  it("ends at once, playing nothing, with no recording and no speech language", () => {
    const onEnd = vi.fn();
    play({ url: null, text: "سلام", speechLang: null }, onEnd);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(spoken).toEqual([]);
  });

  it("stops what was playing when something else starts", () => {
    const first = vi.fn();
    play({ url: "https://cdn/prompt.mp3", text: "x", speechLang: "fa-IR" }, first);
    play({ url: "https://cdn/tile.mp3", text: "y", speechLang: "fa-IR" });
    expect(FakeAudio.instances[0].paused).toBe(true);
    expect(first).toHaveBeenCalledOnce();
  });

  it("does not cancel newer speech when a superseded handle is stopped again later", () => {
    const old = play({ url: null, text: "prompt", speechLang: "fa-IR" });
    play({ url: null, text: "tile", speechLang: "fa-IR" });
    const cancelsAfterHandOver = cancels;
    old.stop();
    expect(cancels).toBe(cancelsAfterHandOver);
  });

  it("fires onEnd exactly once however playback ends", () => {
    const onEnd = vi.fn();
    const handle = play({ url: "https://cdn/a.mp3", text: "x", speechLang: "fa-IR" }, onEnd);
    FakeAudio.instances[0].onended!();
    handle.stop();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
