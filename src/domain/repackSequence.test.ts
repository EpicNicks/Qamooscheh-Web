import { describe, expect, it } from "vitest";
import {
  createAnimationPlayer,
  runDropSequence,
  runGoSequence,
  type PlayAnimation,
  type RepackAnimationName,
} from "./repackSequence";

const tick = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function recorder() {
  const log: string[] = [];
  const play: PlayAnimation = async (name) => {
    log.push(name);
  };
  return { log, play };
}

describe("sequences", () => {
  it("drops, then shakes", async () => {
    const { log, play } = recorder();
    await runDropSequence(play);
    expect(log).toEqual(["drop", "shake"]);
  });

  it("closes the box, then fades, then starts", async () => {
    const { log, play } = recorder();
    await runGoSequence(play, () => log.push("start"));
    expect(log).toEqual(["boxClose", "fadeToTheme", "start"]);
  });

  it("does not start until the fade has finished", async () => {
    const log: string[] = [];
    let finishFade: () => void = () => {};
    const play: PlayAnimation = (name) =>
      name === "fadeToTheme" ? new Promise<void>((r) => (finishFade = r)) : Promise.resolve();
    const done = runGoSequence(play, () => log.push("start"));
    await tick();
    expect(log).toEqual([]);
    finishFade();
    await done;
    expect(log).toEqual(["start"]);
  });
});

describe("createAnimationPlayer", () => {
  it("runs animations one after another, waiting for each to complete", async () => {
    const log: string[] = [];
    const finishers: Array<() => void> = [];
    const player = createAnimationPlayer(
      (name) =>
        new Promise<void>((resolve) => {
          log.push(`start ${name}`);
          finishers.push(() => {
            log.push(`end ${name}`);
            resolve();
          });
        }),
      () => false,
    );
    const first = player("drop");
    const second = player("shake");
    await tick();
    expect(log).toEqual(["start drop"]);
    finishers[0]();
    await first;
    await tick();
    expect(log).toEqual(["start drop", "end drop", "start shake"]);
    finishers[1]();
    await second;
  });

  it("skips every animation under reduced motion", async () => {
    const mounted: RepackAnimationName[] = [];
    const player = createAnimationPlayer(
      async (name) => {
        mounted.push(name);
      },
      () => true,
    );
    const log: string[] = [];
    await runGoSequence(player, () => log.push("start"));
    await runDropSequence(player);
    expect(mounted).toEqual([]);
    expect(log).toEqual(["start"]);
  });
});
