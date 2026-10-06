/**
 * File upload with progress events. Uses XMLHttpRequest because `fetch` cannot report upload
 * progress. The request goes to Oscar's own Route Handlers, never to storage directly.
 */

export type UploadResult<Body> =
  { ok: true; body: Body } | { ok: false; message: string; status: number; aborted: boolean };

export interface UploadHandle<Body> {
  result: Promise<UploadResult<Body>>;
  abort(): void;
}

const networkMessage = "The upload did not finish. Check your connection and try again.";
const genericMessage = "Oscar could not store your file. Try again.";

function errorMessage(responseText: string): string {
  try {
    const body = JSON.parse(responseText) as { message?: unknown };
    return typeof body.message === "string" ? body.message : genericMessage;
  } catch {
    return genericMessage;
  }
}

export function uploadFile<Body>(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
): UploadHandle<Body> {
  const request = new XMLHttpRequest();
  const result = new Promise<UploadResult<Body>>((resolve) => {
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve({ ok: true, body: JSON.parse(request.responseText) as Body });
        } catch {
          resolve({ ok: false, message: genericMessage, status: request.status, aborted: false });
        }
        return;
      }
      resolve({
        ok: false,
        message: errorMessage(request.responseText),
        status: request.status,
        aborted: false,
      });
    });
    request.addEventListener("error", () =>
      resolve({ ok: false, message: networkMessage, status: 0, aborted: false }),
    );
    request.addEventListener("abort", () =>
      resolve({ ok: false, message: "Upload cancelled.", status: 0, aborted: true }),
    );
  });

  const body = new FormData();
  body.set("file", file);
  request.open("POST", url);
  request.setRequestHeader("Accept", "application/json");
  request.send(body);

  return { result, abort: () => request.abort() };
}
