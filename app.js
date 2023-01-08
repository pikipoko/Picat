/* 모듈 선언 */
const http = require("http");
const express = require("express");
const fs = require("fs");
const upload = require("./config/multer");
const path = require("path");

const User = require("./models/User");
const Img = require("./models/Image");
const Face = require("./models/Face");

const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const port = 5000;

// face-api.js 관련 모듈 선언
const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const fileUpload = require("express-fileupload");
faceapi.env.monkeyPatch({ Canvas, Image });

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
app.use(fileUpload({ useTempFiles: true }));

// face-api 관련 함수 선언
var LoadModels = async function () {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/weights");
  await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(__dirname + "/weights");
  await faceapi.nets.tinyFaceDetector.loadFromDisk(__dirname + "/weights");
};
LoadModels();

const useTinyModel = true;

var uploadLabeledImages = async function (images, label) {
  try {
    const descriptions = [];
    // Loop through the images
    for (let i = 0; i < images.length; i++) {
      const img = await canvas.loadImage(images[i]);
      // Read each face and save the face descriptions in the descriptions array
      const detections = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(useTinyModel)
        .withFaceDescriptor();
      console.log(`[${i}]-[${detections}]`);
      if (detections) descriptions.push(detections.descriptor);
    }

    if (descriptions.length > 0) {
      // Create a new face document with the given label and save it in DB
      const newFace = new Face({
        label: label,
        descriptions: descriptions,
      });

      await newFace.save();
      console.log(`[${label}] : 얼굴 인식 성공, DB 저장O`);
      return true;
    } else {
      console.log(`[${label}] : 얼굴 인식 실패, DB 저장X`);
      return false;
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};

var getDescriptorsFromDB = async function (image) {
  // Get all the face data from mongodb and loop through each of them to read the data
  let faces = await Face.find();
  for (i = 0; i < faces.length; i++) {
    // Change the face data descriptors from Objects to Float32Array type
    for (j = 0; j < faces[i].descriptions.length; j++) {
      faces[i].descriptions[j] = new Float32Array(
        Object.values(faces[i].descriptions[j])
      );
    }
    // Turn the DB face docs to
    faces[i] = new faceapi.LabeledFaceDescriptors(
      faces[i].label,
      faces[i].descriptions
    );
  }

  // Load face matcher to find the matching face
  const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);
  // faceapi.TinyFaceDetector();
  // Read the image using canvas or other method
  const img = await canvas.loadImage(image);
  let temp = faceapi.createCanvasFromMedia(img);
  // Process the image for the model
  const displaySize = { width: img.width, height: img.height };
  faceapi.matchDimensions(temp, displaySize);

  // Find matching faces
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(useTinyModel)
    .withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const results = resizedDetections.map((d) =>
    faceMatcher.findBestMatch(d.descriptor)
  );
  return results;
};

/**얼굴인식 라우터 구성 */
app.post("/post-face", async (req, res) => {
  let Files = [];
  if (req.files.File1) Files.push(req.files.File1.tempFilePath);
  if (req.files.File2) Files.push(req.files.File2.tempFilePath);
  if (req.files.File3) Files.push(req.files.File3.tempFilePath);
  const label = req.body.label;
  let result = await uploadLabeledImages(Files, label);
  if (result) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res.json({ message: "Something went wrong, please try again." });
  }
  console.log("POST : post-face finished");
});

app.post("/check-face", async (req, res) => {
  const File = req.files.File.tempFilePath;
  let result = await getDescriptorsFromDB(File);
  res.json({ result });
  console.log("POST : check-face finished");
});

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
    let img_cnt = 0;
    for (; img_cnt < data.length; img_cnt++) {
      /* mongo DB에 id,url 저장하는 코드 추가 필요 */
      const newImg = new Img();
      //값 넣어주기
      newImg.user_room = "room1";
      newImg.user_id = "유저 id";
      newImg.url = data[img_cnt].location;
      result[img_cnt] = data[img_cnt].location;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then((user) => {
          console.log(`[${img_cnt}] - db저장 성공`);
        })
        .catch((err) => {
          res.json({
            message: "이미지 생성정보 저장실패",
          });
        });
    }
    res.json({
      url: result,
      img_cnt: img_cnt,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.post("/app/users/kakao", async (req, res, next) => {
  // data는 브라우저에서 보낸 방 아이디
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
      console.log(`서버가 실행됩니다. http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB 연결 에러", err);
  });
