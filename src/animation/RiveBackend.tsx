// The only file that imports the Rive runtime. <Actor> loads it lazily, so the
// runtime is a separate chunk that never ships to a page without an actor, and
// deleting Rive means deleting this file and the `rive` fields on definitions.
import { useEffect } from "react";
import { EventType, useRive } from "@rive-app/react-canvas";
import type { ActorRenderProps, RiveBinding } from "./actor";
import { riveWrites } from "./riveBinding";

export interface RiveBackendProps<S extends string> extends Omit<ActorRenderProps<S>, "still"> {
  binding: RiveBinding<S>;
  className?: string;
  /** The first frame is ready: the fallback underneath can go. */
  onReady: () => void;
  /** Loading or a binding write failed: stay on the fallback for good. */
  onFail: () => void;
  onSettled: () => void;
}

export default function RiveBackend<S extends string>({
  binding,
  state,
  speed,
  slots,
  className,
  onReady,
  onFail,
  onSettled,
}: RiveBackendProps<S>) {
  const { rive, RiveComponent } = useRive({
    src: binding.src,
    artboard: binding.artboard,
    stateMachines: binding.stateMachine,
    autoplay: true,
    onLoad: onReady,
    onLoadError: onFail,
  });

  useEffect(() => {
    if (!rive) return;
    const onEvent = (e: { data?: unknown }) => {
      const name = (e.data as { name?: string } | undefined)?.name;
      if (name === "settled") onSettled();
    };
    rive.on(EventType.RiveEvent, onEvent);
    return () => rive.off(EventType.RiveEvent, onEvent);
  }, [rive, onSettled]);

  useEffect(() => {
    if (!rive) return;
    try {
      const writes = riveWrites(binding, state, speed, slots);
      for (const input of rive.stateMachineInputs(binding.stateMachine) ?? []) {
        const value = writes.numbers[input.name];
        if (value !== undefined) input.value = value;
      }
      for (const [run, value] of Object.entries(writes.textRuns)) rive.setTextRunValue(run, value);
    } catch {
      onFail();
    }
  }, [rive, binding, state, speed, slots, onFail]);

  return <RiveComponent className={className} aria-hidden="true" />;
}
