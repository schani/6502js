// Tiny static file server for the 6502 debugger (Node)
// Serves src/web/index.html, the built assets in src/web/dist/, and the
// ROM in data/. Run `npm run web:build` first, then `npm run web:serve`.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env["PORT"] ?? 5173);

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

const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    let path = url.pathname;

    if (path === "/") path = "/src/web/index.html";
    else if (path.startsWith("/dist/")) path = "/src/web" + path;

    if (path.split("/").includes("..")) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("Bad request");
        return;
    }

    try {
        const body = await readFile("." + path);
        res.writeHead(200, { "content-type": contentType(path) });
        res.end(body);
    } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found");
    }
});

server.listen(PORT, () => {
    console.log(`Serving on http://localhost:${PORT}`);
});
