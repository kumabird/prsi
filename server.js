import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();

// ------------------------------
// トップページ（URL 入力フォーム）
// ------------------------------
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>My Proxy</title>
        <style>
          body {
            font-family: sans-serif;
            background: #f0f0f0;
            padding: 40px;
          }
          .box {
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 500px;
            margin: auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          input {
            width: 100%;
            padding: 10px;
            font-size: 16px;
            margin-top: 10px;
          }
          button {
            margin-top: 10px;
            padding: 10px;
            width: 100%;
            font-size: 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Proxy Browser</h2>
          <p>アクセスしたい URL を入力してください。</p>
          <input id="url" placeholder="https://example.com">
          <button onclick="go()">開く</button>
        </div>

        <script>
          function go() {
            const u = document.getElementById("url").value;
            if (!u) return alert("URL を入力してください");
            location.href = "/proxy?url=" + encodeURIComponent(u);
          }
        </script>
      </body>
    </html>
  `);
});

// ------------------------------
// プロキシ本体
// ------------------------------
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("URL が必要です");

  try {
    const response = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    let html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // URL 書き換え関数
    const rewrite = (el, attr) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      const absolute = new URL(value, target).href;
      el.setAttribute(attr, "/proxy?url=" + encodeURIComponent(absolute));
    };

    document.querySelectorAll("[src]").forEach(el => rewrite(el, "src"));
    document.querySelectorAll("[href]").forEach(el => rewrite(el, "href"));
    document.querySelectorAll("form").forEach(el => rewrite(el, "action"));

    // CSP 削除
    document.querySelectorAll("meta[http-equiv='Content-Security-Policy']")
      .forEach(el => el.remove());

    // fetch / XHR の書き換え
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

// Render 用ポート
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on " + PORT));
