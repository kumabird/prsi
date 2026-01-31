import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();

app.get("/", (req, res) => {
  res.send("Proxy is running");
});

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("URL が必要です");

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    let html = await response.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // --- 1. HTML 内の URL を書き換え ---
    const rewrite = (el, attr) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      const absolute = new URL(value, target).href;
      el.setAttribute(attr, `/proxy?url=${encodeURIComponent(absolute)}`);
    };

    document.querySelectorAll("[src]").forEach(el => rewrite(el, "src"));
    document.querySelectorAll("[href]").forEach(el => rewrite(el, "href"));
    document.querySelectorAll("form").forEach(el => rewrite(el, "action"));

    // --- 2. CSP を削除（JS が動くようにする） ---
    document.querySelectorAll("meta[http-equiv='Content-Security-Policy']")
      .forEach(el => el.remove());

    // --- 3. JS の fetch/XHR を書き換えるためのスクリプトを注入 ---
    const patchScript = `
      (function() {
        const origFetch = window.fetch;
        window.fetch = function(url, opts) {
          try {
            const absolute = new URL(url, "${target}").href;
            return origFetch("/proxy?url=" + encodeURIComponent(absolute), opts);
          } catch(e) {
            return origFetch(url, opts);
          }
        };

        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
          try {
            const absolute = new URL(url, "${target}").href;
            return origOpen.call(this, method, "/proxy?url=" + encodeURIComponent(absolute));
          } catch(e) {
            return origOpen.call(this, method, url);
          }
        };
      })();
    `;

    const scriptEl = document.createElement("script");
    scriptEl.textContent = patchScript;
    document.body.appendChild(scriptEl);

    res.set("Access-Control-Allow-Origin", "*");
    res.send(dom.serialize());

  } catch (e) {
    res.status(500).send("取得に失敗しました: " + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on " + PORT));
