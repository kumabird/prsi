import express from "express";
import session from "express-session";
import path from "path";

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// パスワードページ
app.get("/", (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect("/home");
  }
  res.sendFile(path.join(process.cwd(), "password.html"));
});

// パスワードチェック
app.post("/login", (req, res) => {
  if (req.body.pass === "157514") {
    req.session.loggedIn = true;
    return res.redirect("/home");
  }
  res.send("パスワードが違います");
});

// 認証が必要なページ
app.get("/home", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/");
  }
  res.send("ログイン成功！ここが本編です。");
});

app.listen(process.env.PORT || 3000);
