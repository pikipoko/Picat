const express = require("express");//
const app = express();//
const http = require("http");
const server = http.createServer(app);
const socketIo = require("socket.io");
const io = socketIo(server);

/*이미지 업로드 */
const multer = require("multer"); //파일업로드 관련


// db 연결
// const { sequelize, User } = require("./models");

// sequelize
//     .sync()
//     .then(() => {
//         console.log("DB connection success");
//     })
//     .catch((err) => {
//         console.error(err);
//     });

// http request 에러 방지: Origin [링크] is not allowed by Access-Control-Allow-Origin.

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(allowCrossDomain);

// 테스트 코드
app.get("/", (req, res) => {
    console.log("hello this is get api");
    res.status(200).send({ hi: 1 });
});

// 소켓 일단 간단하게
io.on("connection", (socket) => {
    console.log(`Socket connected ${socket.id}`);
    socket.on("roomjoin", (userid) => {
        console.log(userid);
        // socket.join(userid);
    });
    socket.on("message", (obj) => {
        // 클라이언트에서 message라는 이름의 이벤트를 받았을 경우 호출
        console.log("server received data :", obj);
        // console.log(obj);
        io.emit("message", obj); // 모든 소켓에 메세지를 보냄
        
    });
    socket.on("disconnect", () => {
        // 클라이언트의 연결이 끊어졌을 때 호출
        console.log(`Socket disconnected : ${socket.id}`);
    });
});

// 3000 포트로 서버 오픈
server.listen(3000, function () {
    console.log("start! express server on port 3000");
});