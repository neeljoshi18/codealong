const DIR = "codealong-media";

async function root(): Promise<FileSystemDirectoryHandle> {
  const base = await navigator.storage.getDirectory();
  return base.getDirectoryHandle(DIR, { create: true });
}

export async function opfsHas(videoId: string): Promise<boolean> {
  try {
    const dir = await root();
    const fh = await dir.getFileHandle(`${videoId}.mp4`);
    const file = await fh.getFile();
    return file.size > 12_000;
  } catch {
    return false;
  }
}

export async function opfsRead(videoId: string): Promise<Blob | null> {
  try {
    const dir = await root();
    const fh = await dir.getFileHandle(`${videoId}.mp4`);
    const file = await fh.getFile();
    return file.size > 12_000 ? file : null;
  } catch {
    return null;
  }
}

export async function opfsWrite(
  videoId: string,
  stream: ReadableStream<Uint8Array>,
  onBytes?: (written: number) => void,
): Promise<void> {
  const dir = await root();
  const fh = await dir.getFileHandle(`${videoId}.mp4`, { create: true });
  const writable = await fh.createWritable();
  let written = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      const copy = new Uint8Array(value.byteLength);
      copy.set(value);
      await writable.write(copy);
      written += copy.byteLength;
      onBytes?.(written);
    }
  }
  await writable.close();
}

export async function opfsForget(videoId?: string): Promise<void> {
  try {
    const dir = await root();
    if (videoId) {
      await dir.removeEntry(`${videoId}.mp4`).catch(() => undefined);
      return;
    }
    const parent = await navigator.storage.getDirectory();
    await parent.removeEntry(DIR, { recursive: true }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
