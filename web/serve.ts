// Tiny static file server for the 6502 debugger (Bun)
// Serves web/index.html, web/dist assets, and repo-root ROM files like osi.bin

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".bin": "application/octet-stream",
};

function contentType(path: string) {
  const m = path.match(/\.[^.]+$/);
  return (m && mime[m[0]]) || "application/octet-stream";
}

const server = Bun.serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") path = "/web/index.html";
    else if (path.startsWith("/dist/")) path = "/web" + path;

    // Try exact path first
    let filePath = Bun.file("." + path);
    if (await filePath.exists()) {
      return new Response(filePath, { headers: { "content-type": contentType(path) } });
    }

    // If no extension, try .js fallback for ESM imports
    if (!/\.[^/]+$/.test(path)) {
      const jsPath = path + ".js";
      filePath = Bun.file("." + jsPath);
      if (await filePath.exists()) {
        return new Response(filePath, { headers: { "content-type": contentType(jsPath) } });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Serving on http://localhost:${server.port}`);
