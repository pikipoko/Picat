/* 모듈 선언 */
const http = require("http");
const express = require("express");
const upload = require("./config/multer");
const mongoose = require("mongoose");

/* Models */
const User = require("./models/User");
const Img = require("./models/Image");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const port = 5000;

const { login } = require("./routes/login");
const { invite_friends } = require("./routes/friend");
const { upload_image } = require("./routes/upload_image");
const { LoadModels } = require("./config/face_api");
const { allowCrossDomain } = require("./config/allowCrossDomain");

LoadModels();

/*공통 미들웨어 장착*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(allowCrossDomain);

/* 라우터 구성 */
app.post("/image", upload.array("image"), upload_image);

/* 카카오톡을 통한 로그인 */
app.post("/app/users/kakao", login);

/* 친구 초대 */
app.post("/friends", invite_friends);

/* 소켓 통신 */
io.sockets.on("connection", (socket) => {
  console.log(`Socket connected ${socket.id}`);

  // 공유방 입장
  socket.on("join", async (id) => {
    let roomIdx = await User.findOne(
      { id: id },
      {
        id: 0,
        nickname: 0,
        picture: 0,
        email: 0,
        roomIdx: 1,
        total_count: 0,
        descriptions: 0,
        elements: 0,
      }
    ).exec();
    console.log(`user(${id}) joined, room:${roomIdx}`);

    socket.join(roomIdx); // 네임스페이스 아래에 존재하는 방에 접속
    const find_images = await Img.find(
      { roomIdx: roomIdx },
      { _id: 0, url: 1 }
    ).exec();
    const emit_data = {
      img_list: find_images,
      img_cnt: find_images.length,
    };
    io.to(socket.id).emit("join", emit_data);
    console.log(emit_data);
  });

  // 다른 유저들에게 사진 전송
  socket.on("image", async (images, id) => {
    const roomIdx = await User.findOne(
      { id: id },
      {
        id: 0,
        nickname: 0,
        picture: 0,
        email: 0,
        roomIdx: 1,
        total_count: 0,
        descriptions: 0,
        elements: 0,
      }
    ).exec();
    io.sockets.in(roomIdx).emit("image", images);
    // io.emit("image", images); //모두에게 전송
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected : ${socket.id}`);
  });
});

/*db 설정*/
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGODB_URL, {
    dbName: "picat", // 접속할 데이터베이스
  })
  .then(() => {
    console.log("MongoDB 연결 성공");

    /*생성된 서버가 포트를 리스닝 */
    server.listen(port, (err) => {
      console.log(`서버가 실행됩니다...${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB 연결 에러", err);
  });
