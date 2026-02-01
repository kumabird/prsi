const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("URL is required");
    }

    try {
        const response = await fetch(targetUrl);
        let body = await response.text();

        res.removeHeader("X-Frame-Options");
        res.removeHeader("Content-Security-Policy");
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Content-Type", response.headers.get("content-type"));

        res.send(body);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

app.listen(3000, () => {
    console.log("Proxy server running");
});
