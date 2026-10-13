// fetch that retries when the free server is waking up (502/503/504 or network error)
export async function fetchWithRetry(url, options, tries = 3, delayMs = 5000, onWait) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, options);
      if (![502, 503, 504].includes(res.status)) return res;
      last = res;
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) {
      if (onWait) onWait();
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  if (last instanceof Response) return last;
  throw last;
}

// Reads a readable error message from a failed response
export async function errorText(res, fallback = 'Something went wrong') {
  try {
    const data = await res.json();
    if (data.error) return data.detail ? `${data.error} (${data.detail})` : data.error;
  } catch (e) {}
  return res.status >= 500
    ? 'The server is not responding. Wait a minute and try again.'
    : fallback;
}
