/**
 * A one-way bridge from anywhere in the app into the developer console, so the
 * footer's command list can be clicked. If nothing is listening yet the command
 * is held until the console mounts.
 */

type Listener = (text: string) => void;

let queued: string | null = null;
const listeners = new Set<Listener>();

/** Opens the console with this command prefilled. */
export function sendToConsole(text: string) {
  if (listeners.size === 0) {
    queued = text;
    return;
  }
  for (const listener of listeners) listener(text);
}

/** Subscribes the console. Delivers anything queued while it was unmounted. */
export function onConsoleCommand(listener: Listener): () => void {
  listeners.add(listener);
  if (queued !== null) {
    const text = queued;
    queued = null;
    listener(text);
  }
  return () => {
    listeners.delete(listener);
  };
}
