const express = require("express");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const app = express();

// 相対パス → 絶対URLに変換
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

// プロキシ本体
app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("URL is required");

    try {
        const response = await fetch(targetUrl);
        const contentType = response.headers.get("content-type");

        // HTML の場合は書き換え処理
        if (contentType && contentType.includes("text/html")) {
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // URL書き換え関数
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

            // HTML内のリンクを全部書き換える
            rewrite("a", "href");
            rewrite("img", "src");
            rewrite("script", "src");
            rewrite("link", "href");

            res.set("Content-Type", "text/html");
            res.send(dom.serialize());
        } else {
            // HTML以外（画像・CSS・JS）はそのまま返す
            const buffer = await response.buffer();
            res.set("Content-Type", contentType);
            res.send(buffer);
        }

    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Render用ポート
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Proxy server running");
});
