const express = require("express");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 相対パス → 絶対URL
function absolute(base, relative) {
    try {
        return new URL(relative, base).href;
    } catch {
        return relative;
    }
}

// トップページ（検索画面）
app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Proxy Search</title>
            <style>
                body { font-family: sans-serif; text-align: center; margin-top: 80px; }
                input { width: 350px; padding: 10px; font-size: 16px; }
                button { padding: 10px 20px; font-size: 16px; }
            </style>
        </head>
        <body>
            <h2>Proxy Search</h2>
            <form action="/proxy" method="get">
                <input type="text" name="url" placeholder="URLを入力">
                <button type="submit">開く</button>
            </form>
        </body>
        </html>
    `);
});

// GET / POST 両対応のプロキシ
app.all("/proxy", async (req, res) => {
    const targetUrl = req.method === "GET" ? req.query.url : req.body.url;
    if (!targetUrl) return res.status(400).send("URL is required");

    try {
        const options = {
            method: req.method,
            headers: { ...req.headers },
            redirect: "follow"
        };

        // Cookie を転送
        if (req.headers.cookie) {
            options.headers.cookie = req.headers.cookie;
        }

        // POST の場合は body を転送
        if (req.method === "POST") {
            options.body = new URLSearchParams(req.body);
        }

        const response = await fetch(targetUrl, options);
        const contentType = response.headers.get("content-type");

        // CSP / X-Frame-Options を削除
        res.removeHeader("Content-Security-Policy");
        res.removeHeader("X-Frame-Options");

        // HTML の場合は書き換え
        if (contentType && contentType.includes("text/html")) {
            let html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            const rewrite = (selector, attr) => {
                document.querySelectorAll(selector).forEach(el => {
                    const url = el.getAttribute(attr);
                    if (url) {
                        const abs = absolute(targetUrl, url);
                        el.setAttribute(attr,
                            `/proxy?url=${encodeURIComponent(abs)}`
                        );
                    }
                });
            };

            // HTML 内の URL を書き換え
            rewrite("a", "href");
            rewrite("img", "src");
            rewrite("script", "src");
            rewrite("link", "href");
            rewrite("iframe", "src");
            rewrite("form", "action");

            // JavaScript 内の URL を簡易置換
            html = dom.serialize().replace(
                /src="\/([^"]+)"/g,
                (match, p1) =>
                    `src="/proxy?url=${encodeURIComponent(absolute(targetUrl, "/" + p1))}"`
            );

            res.set("Content-Type", "text/html");
            res.send(html);
        } else {
            // HTML 以外はそのまま返す
            const buffer = await response.buffer();
            res.set("Content-Type", contentType);
            res.send(buffer);
        }

    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Render 用ポート
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("server running");
});
