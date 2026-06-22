import * as THREE from "three";

/**
 * Load a wetsuit texture, retrying on transient failures.
 *
 * A freshly generated texture is uploaded to Supabase Storage and its public
 * URL handed straight to the diver. For a brief moment right after the upload
 * the object can still 4xx (CDN/propagation), and `TextureLoader` has no retry —
 * so the suit silently stays blank until the page is reloaded (when the object
 * is reliably available). Retrying with a short backoff fixes the apply without
 * needing a reload.
 *
 * Returns a cancel function (call on cleanup) so a stale load can't apply after
 * the component unmounts or the url changes.
 */
export function loadSuitTexture(
  url: string,
  onLoad: (tex: THREE.Texture) => void,
  attempts = 4,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  let n = 0;

  const attempt = () => {
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        onLoad(tex);
      },
      undefined,
      () => {
        if (cancelled) return;
        n += 1;
        if (n < attempts) timer = setTimeout(attempt, 400 * n);
        else console.warn(`Suit texture failed to load after ${attempts} attempts:`, url);
      },
    );
  };
  attempt();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
