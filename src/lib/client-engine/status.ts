export type ClientMediaStatus = {
  progress: number;
  message: string;
  full: boolean;
};

const listeners = new Set<(s: ClientMediaStatus) => void>();
let current: ClientMediaStatus = { progress: 0, message: "", full: false };

export function getClientMediaStatus(): ClientMediaStatus {
  return current;
}

export function setClientMediaStatus(next: Partial<ClientMediaStatus>) {
  current = { ...current, ...next };
  for (const fn of listeners) fn(current);
}

export function subscribeClientMedia(fn: (s: ClientMediaStatus) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}
