/* 모듈 선언 */
const http = require("http");
const express = require("express");
const fs = require("fs");
const upload = require("./config/multer");
const path = require("path");

const User = require("./models/User");
const Img = require("./models/Image");
const mongoose = require("mongoose");

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

/*db 설정*/

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGODB_URL, {
    dbName: "picat", // 접속할 데이터베이스
  })
  .then(() => {
    console.log("MongoDB 연결 성공");

    /*라우터 구성 */
    app.get("/view", async (req, res) => {
      const find_room = await Img.find(
        { user_room: "room1" },
        { _id: 0, url: 1 }
      ).exec();
      console.log(find_room);

      res.send(find_room);
    });

    app.get("/", (req, res) => {
      fs.readFile("HTMLPage.html", (error, data) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      });
    });

    app.post("/image", upload.array("image"), async (req, res, next) => {
      try {
        // var file = './uploads' + req.file.filename;
        console.log(req.files);
        var data = req.files;
        var result = [];
        let i = 0;
        for (; i < data.length; i++) {
          /* mongo DB에 id,url 저장하는 코드 추가 필요 */
          const newImg = new Img();
          //값 넣어주기
          newImg.user_room = "room1";
          newImg.user_id = "유저 id";
          newImg.url = data[i].location;
          result[i] = data[i].location;
          await newImg
            .save() //실제로 저장된 유저값 불러옴
            .then((user) => {
              console.log(`[${i}] - db저장 성공`);
            })
            .catch((err) => {
              res.json({
                message: "이미지 생성정보 저장실패",
              });
            });
        }
        res.json({
          url: result,
          img_cnt: i,
        });
      } catch (error) {
        console.error(error);
        next(error);
      }
    });

    app.post("/app/users/kakao", async (req, res, next) => {
      // data는 브라우저에서 보낸 방 아이디
      console.log("==가입===");
      console.log(req.body);
      console.log(req.body.elements[0]);
      await User.deleteOne({ email: req.body.email });
      const newUser = new User();
      const userInfo = req.body;

      newUser.id = userInfo.id;
      newUser.nickname = userInfo.nickname;
      newUser.picture = userInfo.picture;
      newUser.email = userInfo.email;
      newUser.total_count = userInfo.total_count;
      newUser.elements = [];
      for (let i = 0; i < userInfo.total_count; i++) {
        newUser.elements.push({
          id: userInfo.elements[i].id,
          uuid: userInfo.elements[i].uuid,
          favorite: userInfo.elements[i].favorite,
          profile_nickname: userInfo.elements[i].profile_nickname,
          profile_thumbnail: userInfo.elements[i].profile_thumbnail,
        });
      }

      newUser
        .save()
        .then((user) => {
          res.json({
            message: "유저 정보 DB 저장 성공",
            isSuccess: true,
          });
        })
        .catch((err) => {
          res.json({
            message: "유저 정보 DB 저장 실패",
            isSuccess: false,
          });
        });
    });

    /* 소켓 통신 */
    io.sockets.on("connection", (socket) => {
      console.log(`Socket connected ${socket.id}`);

      // message
      var roomIdx = null;
      socket.on("join", async (data) => {
        // data는 브라우저에서 보낸 방 아이디
        console.log("user joined");
        console.log(data);
        roomIdx = data;
        socket.join(data); // 네임스페이스 아래에 존재하는 방에 접속
        const find_images = await Img.find(
          { user_room: "room1" },
          { _id: 0, url: 1 }
        ).exec();
        const emit_data = {
          img_list: find_images,
          img_cnt: find_images.length,
        };
        io.to(socket.id).emit("join", emit_data);
        console.log(emit_data);
      });
      socket.on("image", (images) => {
        // io.sockets.in(roomIdx).emit("image", img_list);
        // io.emit("image", Object.values(img_list)[0]); //모두에게 전송
        io.emit("image", images); //모두에게 전송
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
  })
  .catch((err) => {
    console.error("MongoDB 연결 에러", err);
  });
