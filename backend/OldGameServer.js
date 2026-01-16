import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSafe } from "../utils/execSafe.js";
import getMimeLookupRecord from "../utils/getMimeLookupRecord.js";

const host = '0.0.0.0';
const port = 9000;

const mimeLookup = getMimeLookupRecord();

async function handleRequest(req, res) {
  const url = req.url.substring(req.url.indexOf("/", 1) + 1);
  if (!url || url.length === 0) {
    return { redirect: "./index.html" };
  }
  return {
    path: url,
  }
}

const favIcon = fs.readFileSync("./favicons/favicon.ico");
const faviconTime = fs.statSync("./favicons/favicon.ico").mtime.toUTCString();

const server = http.createServer((req, res) => {
  const { remoteAddress, remotePort } = req.socket;

  if (req.url === "/" || req.url === "/index.html" || req.url === "/redirect.html" || req.url.startsWith('/index')) {
    return execSafe(
      () => {
        try {
        const data = fs.readFileSync("./redirect.html");
        const stat = fs.statSync("./redirect.html");
        res.writeHead(200, {
          "Content-Type": "text/html; charset=UTF-8",
          "Content-Length": data.byteLength,
          'Date': new Date().toUTCString(),
          'Last-Modified': stat.mtime.toUTCString(),
          'Cache-Control': 'public, max-age=1',
          'Pragma': 'public',
          'Expires': new Date(Date.now() + 1000).toUTCString()
        });
        res.end(data);
        
        } catch (e) {
          console.error("Error reading redirect.html:", e.message);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal Server Error");
        }
      },
    );
  }
  if (req.url.endsWith("favicon.ico") || req.url === "/favicons/favicon.ico") {
    return execSafe(
      () =>
        res.writeHead(200, {
          "Content-Type": "image/x-icon",
          "Content-Length": favIcon.byteLength,
          'Date': new Date().toUTCString(),
          'Last-Modified': faviconTime,
          'Cache-Control': 'public, max-age=60',
          'Pragma': 'public',
          'Expires': new Date(Date.now() + 60000).toUTCString()
        }),
      () => res.end(favIcon)
    );
  }
  const staticList = ["/images/header.png", "/images/background.png"];
  for (const k of staticList) {
    if (req.url.endsWith(k)) {
      console.log("Serving", k);
      return execSafe(
        () => {
          const data = fs.readFileSync("." + k);
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": data.byteLength,
            'Date': new Date().toUTCString(),
            'Cache-Control': 'public, max-age=240',
            'Pragma': 'public',
            'Expires': new Date(Date.now() + 240 * 1000).toUTCString()
          });
          if (req.method === "HEAD" || req.method === "OPTIONS") {
            res.end();
            return
          }
          res.end(data);
        },
      );
    }
  }

  (!req.url.includes('?_livewatch=')) && console.log(req.method, req.url, "from", remoteAddress + ':' + remotePort);
  handleRequest(req, res)
    .then((data) => {
      if (typeof data === "number" && !isNaN(data)) {
        console.log(req.method, req.url, "Finished with status", data);
        return execSafe(
          () => res.writeHead(data, { "Content-Type": "text/plain" }),
          () => res.end(`Response with status code ${data}`)
        );
      }
      if (
        data &&
        typeof data === "object" &&
        Object.keys(data).join(",") === "redirect" &&
        typeof data.redirect === "string" &&
        !data.redirect.includes("/../")
      ) {
        const q = data.redirect.indexOf("?");
        const target = data.redirect.substring(0, q === -1 ? data.redirect.length : q);
        console.log(req.method, req.url, "Redirecting to:", target);
        return execSafe(
          () => res.writeHead(307, { Location: target }),
          () => res.end()
        );
      }
      if (
        data &&
        typeof data === "object" &&
        Object.keys(data).join(",") === "path" &&
        typeof data.path === "string" &&
        !data.path.includes("/../")
      ) {
        const q = data.path.indexOf("?");
        let target = data.path.substring(0, q === -1 ? data.path.length : q);
        if (!fs.existsSync(target)) {
          console.log(
            req.method,
            req.url,
            "Cannot serve file (not found):",
            target
          );
          return execSafe(
            () => res.writeHead(404, { "Content-Type": "text/plain" }),
            () => res.end("Error: Could not find file")
          );
        }
        if (fs.statSync(target).isDirectory()) {
          target = `${target}/index.html`;
          if (!fs.existsSync(target)) {
            console.log(
              req.method,
              req.url,
              "Cannot serve index file (not found):",
              target
            );
            return execSafe(
              () => res.writeHead(404, { "Content-Type": "text/plain" }),
              () => res.end("Error: Could not find file")
            );
          }
        }
        fs.promises
          .readFile(target)
          .then((buffer) => {
            const dot = target.lastIndexOf(".");
            const type = mimeLookup[target.substring(dot + 1)] || "text/plain";
            execSafe(
              () =>
                res.writeHead(200, {
                  "Content-Type": type,
                  "Content-Length": buffer.byteLength,
                  'Date': new Date().toUTCString(),
                  'Last-Modified': fs.statSync(target).mtime.toUTCString(),
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }),
              () => res.end(buffer)
            );
          })
          .catch((err) => {
            console.log(req.method, req.url, "Failed");
            console.error("Static request handling failed:", err);
            execSafe(
              () => res.writeHead(500, { "Content-Type": "text/plain" }),
              () => res.end(`${err.name}: ${err.message}`)
            );
          });
        return;
      }
      if (data !== undefined) {
        console.log("Handle request response:", data);
        throw new Error(
          `Unexpected handle request response of type "${typeof data}"`
        );
      }
      console.log(req.method, req.url, "Finished");
      console.log("Request handled successfully");
    })
    .catch((err) => {
      console.log(req.method, req.url, "Failed");
      console.error("Request handling failed:", err);
      execSafe(
        () => res.writeHead(500, { "Content-Type": "text/plain" }),
        () => res.end(`${err.name}: ${err.message}`)
      );
    });
});


server.on('error', (err) => {
  console.error('Server error:', err["code"], err.message);
  if (err["code"] === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please choose a different port.`);
  }
  process.exit(1);
});

console.log('Starting local TCP server at', `${host}:${port}`);

server.listen(parseInt(String(port)), host, () => {
  console.log(`Listening at http://${host}:${port}`);
});