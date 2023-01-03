/*모듈선언 */
const http = require("http");
const express = require("express");
const fs = require("fs");
const upload = require("./config/multer");
const path = require("path");
//웹서버 생성
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const port = 5000;

/*http request 에러 방지: Origin [링크] is not allowed by Access-Control-Allow-Origin.*/
var allowCrossDomain = function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Request methods you wish to allow
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    // Request headers you wish to allow
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-Requested-With,content-type"
    );
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
};

/*공통 미들웨어 장착*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(allowCrossDomain);

/*라우터 구성 */
// app.get("/", (req, res) => {res.send("Hello World!!! 수민");});
app.get("/", (req, res) => {
    fs.readFile("HTMLPage.html", (error, data) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
    });
});
app.post("/image", upload.single("image"), function (req, res, next) {
    try {
        // var file = './uploads' + req.file.filename;
        console.log(req.file);
        var data = req.file;
        // res.send(data.location);
        res.send(data);

        // mongodb에 data.location를 저장
    } catch (error) {
        console.error(error);
        next(error);
    }
});

/* 소켓 통신 */
io.sockets.on("connection", (socket) => {
    console.log(`Socket connected ${socket.id}`);

    // message
    var roomName = null;
    socket.on("join", (data) => {
        // data는 브라우저에서 보낸 방 아이디
        roomName = data;
        console.log("roomName - " + roomName);
        socket.join(data); // 네임스페이스 아래에 존재하는 방에 접속
    });

    socket.on("message", (data) => {
        // console.log(data);
        console.log("server received data :", data);
        io.sockets.in(roomName).emit("message", data);
        // io.emit("message", obj); // app2 : 모든 소켓에 메세지를 보냄
    });

    socket.on("image", (data) => {
        io.sockets.in(roomName).emit("image", data);
        console.log(data.message);
    });

    socket.on("disconnect", () => {
        // 클라이언트의 연결이 끊어졌을 때 호출
        console.log(`Socket disconnected : ${socket.id}`);
    });
});

/*생성된 서버가 포트를 리스닝 */
server.listen(port, () => {
    console.log(`서버가 실행됩니다. http://localhost:${port}`);
});
// app.listen(port, () => console.log("Express server listening on PORT" + port));
