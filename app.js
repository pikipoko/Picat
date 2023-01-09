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

const {
  LoadModels,
  makeDescription,
  getDescriptorsFromDB,
} = require("./face_api");

LoadModels();

/*http request 에러 방지: Origin [링크] is not allowed by Access-Control-Allow-Origin.*/
let allowCrossDomain = function (req, res, next) {
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
// app.use(fileUpload({ useTempFiles: true }));

/* 라우터 구성 */
app.post("/image", upload.array("image"), async (req, res, next) => {
  try {
    let data = req.files;
    let result = [];
    let img_cnt = 0;
    let check_result = [];
    for (let i = 0; i < data.length; i++) {
      /* mongo DB에 id, url 저장하는 코드 추가 필요 */
      const newImg = new Img();
      newImg.room = 1;
      newImg.id = req.body.id;
      newImg.url = data[img_cnt].location;
      result[img_cnt] = data[img_cnt].location;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then(async (user) => {
          const DescriptorsFromDB = await getDescriptorsFromDB(
            data[img_cnt].location,
            req.body.id
          );
          if (DescriptorsFromDB) check_result.push(DescriptorsFromDB);
          console.log(`[${img_cnt}] - db저장 성공 ${check_result}`);
          img_cnt++;
        })
        .catch((err) => {
          res.json({
            message: "이미지 생성정보 db저장실패",
          });
          console.error(err);
        });
    }
    res.json({
      url: result,
      img_cnt: img_cnt,
      result: check_result,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * 카카오톡 로그인, 친구 목록 조회 후
 * 유저 정보, 친구목록 정보 모두 DB 저장
 */
app.post("/app/users/kakao", async (req, res, next) => {
  const userInfo = req.body;

  const findUser = await User.findOne({ id: req.body.id }).exec();
  let descriptions = null;

  // 프로필 사진이 바뀌지 않은 경우, descriptions 수정 필요X
  if (findUser) descriptions = findUser.descriptions;
  if (findUser && findUser.picture !== userInfo.picture)
    descriptions = await makeDescription(userInfo.picture);

  const elements = [];
  for (let i = 0; i < userInfo.total_count; i++) {
    elements.push({
      id: userInfo.elements[i].id,
      uuid: userInfo.elements[i].uuid,
      favorite: userInfo.elements[i].favorite,
      profile_nickname: userInfo.elements[i].profile_nickname,
      profile_thumbnail: userInfo.elements[i].profile_thumbnail,
    });
  }
  if (findUser) {
    await User.updateOne(
      { id: req.body.id },
      {
        $set: {
          nickname: userInfo.nickname,
          picture: userInfo.picture,
          total_count: userInfo.total_count,
          email: userInfo.email,
          descriptions: descriptions,
          elements: elements,
        },
      }
    );

    res.json({
      message: "유저 정보 DB 업데이트 완료",
      isSuccess: true,
    });
  } else {
    const newUser = new User();

    descriptions = await makeDescription(userInfo.picture);

    newUser.id = userInfo.id;
    newUser.nickname = userInfo.nickname;
    newUser.picture = userInfo.picture;
    newUser.email = userInfo.email;
    newUser.total_count = userInfo.total_count;
    newUser.descriptions = descriptions;
    newUser.elements = elements;

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
  }
  console.log("/app/users/kakao finished");
});

/* 소켓 통신 */
io.sockets.on("connection", (socket) => {
  console.log(`Socket connected ${socket.id}`);

  // message
  let roomIdx = null;
  socket.on("join", async (room) => {
    // room은 클라이언트에서 보낸 방 아이디
    console.log("user joined");
    console.log(room);
    roomIdx = room;
    socket.join(room); // 네임스페이스 아래에 존재하는 방에 접속
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
