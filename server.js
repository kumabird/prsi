// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("url is required");

  try {
    const response = await fetch(target);
    const text = await response.text();
    res.send(text);
  } catch (e) {
    res.status(500).send("Error fetching target");
  }
});

app.listen(process.env.PORT || 3000);
