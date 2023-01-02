const express = require("express");
// const hostname = '3.35.236.31'
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!!! 수민");
});

app.listen(port, () => {
  console.log(`서버가 실행됩니다. http://localhost:${port}`);
});
// app.listen(port, () => console.log("Express server listening on PORT" + port));
