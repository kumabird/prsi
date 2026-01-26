import express from "express";
import session from "express-session";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// パスワード入力ページ（HTMLを直接埋め込み）
const passwordPage = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>パスワード入力</title>
</head>
<body>
  <h2>パスワードを入力してください</h2>
  <form method="POST" action="/login">
    <input type="password" name="pass" placeholder="パスワード">
    <button type="submit">送信</button>
  </form>
</body>
</html>
`;

// ログイン後のページ（HTMLを直接埋め込み）
const homePage = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>本編</title>
</head>
<body>
  <h1>ログイン成功！</h1>
  <p>ここが本編ページです。</p>
</body>
</html>
`;

// 初期ページ
app.get("/", (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect("/home");
  }
  res.send(passwordPage);
});

// パスワードチェック
app.post("/login", (req, res) => {
  if (req.body.pass === "157514") {
    req.session.loggedIn = true;
    return res.redirect("/home");
  }
  res.send("パスワードが違います");
});

// 本編ページ
app.get("/home", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/");
  }
  res.send(homePage);
});

// プロキシ機能
app.get("/proxy", async (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(403).send("ログインが必要です");
  }

  const target = req.query.url;
  if (!target) return res.status(400).send("url が必要です");

  try {
    const response = await fetch(target);
    const text = await response.text();
    res.send(text);
  } catch (e) {
    res.status(500).send("取得エラー");
  }
});

app.listen(process.env.PORT || 3000);
