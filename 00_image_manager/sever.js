const express = require("express");
const multer = require("multer"); //파일업로드 관련
const { v4: uuid } = require("uuid"); //파일 고유아이디 생성
const mime = require("mime-types");
// console.log('uudi: ', uuid());

//destionation은 어디에 저장할지 그리고 filename은 어떤 이름으로 저장할지
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"), //파일 저장될 목적지
  filename: (
    req,
    file,
    cb //파일명 변경
  ) => cb(null, `${uuid()}.${mime.extension(file.mimetype)}`), //우리가 원하는 파일 이름 생성
});

//multer에서 미들웨어가 리턴되므로 upload라는 미들웨어생성
//dest : 어디에 저장할 거냐? -> 폴더 생성
/*이미지 저장하기 전 필터 걸기 : 이미지가 아닌다른파일 업로드, 용량제한 */
//fileFilter : 이미지 저장하기 전 필터
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // if (file.mimetype === "image/jpeg") {cb(null, true);}//True : 파일저장, False:저장 X
    if (["image/jpeg", "imgae/png"].includes(file.mimetype)) {
      cb(null, true);
    } //True : 파일저장, False:저장 X
    else {
      cb(new Error("invalid file type!!"), false);
    }
  },
  limits: {
    //용량제한
    fileSize: 1024 * 1024 * 5, //5MB
  },
});

const app = express();
const PORT = 5000;

/* 특정 폴더만 외부에 노출하기(클라이언트에서 사진 조회할 수 있도록) */
//아래처럼 하면 이 주소로 접근시 사진 나옴 : http://localhost:5000/uploads/94bae2ec-cf93-4535-8a0d-7cfee2c4c62e.jpeg
app.use("/uploads", express.static("uploads")); //폴더명 지정

//클라이언트에서 post 날리면 이미지는 req바디 안에 이미 저장됨 -> 하지만 보기 쉽지 않음
//upload라는 미들웨어를 가지고 req에서 이미지 뽑아와서 uploads 폴더에 넣어줄거임
//upload : req 바디에 이미 저장되어있는 이미지 뽑아와서 uploads 폴더에 넣어주는 미들웨어
app.post("/upload", upload.single("imageTest"), (req, res) => {
  //upload라는 미들웨어 추가!, upload.array도 가능, "image"는 변수명
  console.log(req.file);
  res.json(req.file);
});

app.listen(PORT, () => console.log("Express server listening on PORT" + PORT));
