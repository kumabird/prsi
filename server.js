const express = require("express");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const app = express();

function absolute(base, relative) {
    try {
        return new URL(relative, base).href;
    } catch {
        return relative;
    }
}

app.get("/", (req, res) => {
    res.send("Proxy server is running");
});

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

            // すべてのタグの URL を書き換える
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

            rewrite("a", "href");
            rewrite("img", "src");
            rewrite("script", "src");
            rewrite("link", "href");

            res.set("Content-Type", "text/html");
            res.send(dom.serialize());
        } else {
            // HTML 以外（画像・CSS・JS）はそのまま返す
            const buffer = await response.buffer();
            res.set("Content-Type", contentType);
            res.send(buffer);
        }

    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

app.listen(3000, () => {
    console.log("Proxy server running");
});
