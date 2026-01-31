import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("URL が必要です");

  try {
    const response = await fetch(target);
    let html = await response.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // URL 書き換え
    document.querySelectorAll("[src]").forEach(el => {
      const url = new URL(el.src, target).href;
      el.src = `/proxy?url=${encodeURIComponent(url)}`;
    });

    document.querySelectorAll("[href]").forEach(el => {
      const url = new URL(el.href, target).href;
      el.href = `/proxy?url=${encodeURIComponent(url)}`;
    });

    res.set("Access-Control-Allow-Origin", "*");
    res.send(dom.serialize());
  } catch (e) {
    res.status(500).send("取得に失敗しました");
  }
});

app.listen(3000, () => console.log("Proxy running"));
