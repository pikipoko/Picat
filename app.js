/* 모듈 선언 */
const http = require("http");
const express = require("express");
const fs = require("fs");
const upload = require("./config/multer");
const path = require("path");

/*db 설정*/
const User = require("./models/User");
const Img = require("./models/Image");
const mongoose = require("mongoose");
mongoose.set("strictQuery", true);
console.log(process.env.MONGODB_URL);
mongoose
    .connect(
        process.env.MONGODB_URL
        // {
        //     dbName: "picat", // 접속할 데이터베이스
        // },
    )
    .then(() => {
        console.log("MongoDB 연결 성공");
    })
    .catch((err) => {
        console.error("MongoDB 연결 에러", err);
    });

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
app.get("/test", (req, res) => {
    const newUser = new User();
    //값 넣어주기
    newUser.email = "picat@abc.123";
    newUser.name = "picat";
    newUser.age = 25;
    newUser
        .save() //실제로 저장된 유저값 불러옴
        .then((user) => {
            console.log(user);
            res.json({
                message: "유저 성공적으로 생성됨",
                email: newUser.email,
                name: newUser.name,
                age: newUser.age,
            });
        })
        .catch((err) => {
            res.json({
                message: "User 생성 실패",
            });
        });
});
/*find test */
app.get("/view", async (req, res) => {
    // const newImg = new Img();
    const find_room = await Img.find(
        { user_room: "room1" },
        { _id: 0, url: 1 }
    ).exec();
    console.log(find_room);

    res.send(find_room);
    // console.log(Img.find({ user_room: "room1" } ));
    // res.send(Img.find({ user_room: "room1" }));
});

app.get("/", (req, res) => {
    fs.readFile("HTMLPage.html", (error, data) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
    });
});

app.post("/image", upload.single("image"), (req, res, next) => {
    try {
        // var file = './uploads' + req.file.filename;
        console.log(req.file);
        var data = req.file;
        // res.send(data.location);
        // res.send(data);
        /* mongo DB에 id,url 저장하는 코드 추가 필요 */
        //json {room:roomName, userid: socket.id, imgurl: data.location, }
        const newImg = new Img();
        //값 넣어주기
        newImg.user_room = "room1";
        newImg.user_id = "유저 id";
        newImg.url = data.location;
        newImg
            .save() //실제로 저장된 유저값 불러옴
            .then((user) => {
                console.log(user);
                res.json({
                    message: "이미지 생성정보 성공적으로 저장",
                    location: data.location,
                    user_room: newImg.user_room,
                });
            })
            .catch((err) => {
                res.json({
                    message: "이미지 생성정보 저장실패",
                });
            });
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
        socket.join(data); // 네임스페이스 아래에 존재하는 방에 접속
    });
    socket.on("image", (data) => {
        // io.sockets.in(roomName).emit("image", data);
        io.emit("image", data); //모두에게 전송
        console.log(data);
    });
    socket.on("disconnect", () => {
        // 클라이언트의 연결이 끊어졌을 때 호출
        console.log(`Socket disconnected : ${socket.id}`);
    });
});

/*생성된 서버가 포트를 리스닝 */
server.listen(port, (err) => {
    console.log(`서버가 실행됩니다. http://localhost:${port}`);
});
// app.listen(port, () => console.log("Express server listening on PORT" + port));
