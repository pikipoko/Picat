require("dotenv").config;
const fetch = require("node-fetch");
const User = require("../models/User");
const AWS = require("aws-sdk");

const { checkInTheRoom } = require("../config/checkInOut");

const fs = require("fs");
const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});

const uploadImageToS3 = async (imageUrl, fileName) => {
  return new Promise((resolve, reject) => {
    fetch(imageUrl).then((res) => {
      res.body
        .pipe(fs.createWriteStream(`config/users/${fileName}.jpg`))
        .on("finish", (data) => {
          const param = {
            Bucket: process.env.PICAT,
            Key: `users/${fileName}.jpg`, // s3 bucket 에다가 다운.
            // ACL: "public-read",
            Body: fs.createReadStream(`config/users/${fileName}.jpg`), // 우리 서버에다가 다운
            ContentType: "image/jpg",
          };

          s3.upload(param, (error, data) => {
            if (error) {
              console.log("upload s3 error", error);
            }
          });
        });
    });
  });
};

const login = async function (req, res, next) {
  const userInfo = req.body;
  const findUser = await User.findOne({ id: req.body.id }).exec();

  /**친구 id 저장 */
  const elements = userInfo.elements.map((obj) => obj.id);
  const friendList = userInfo.elements.map((obj) => obj.profile_nickname);

  console.log(`카카오 친구목록 - 총${friendList.length}명 [${friendList}]`);
  console.log(`(elements) - 총${elements.length}명 [${elements}]`);

  uploadImageToS3(userInfo.picture, userInfo.id);

  /**기존 사용자면 업데이트 */
  if (findUser) {
    await User.updateOne(
      { id: userInfo.id },
      {
        $set: {
          nickname: userInfo.nickname,
          picture: userInfo.picture,
          total_count: userInfo.total_count,
          email: userInfo.email,
          elements: elements,
          my_device_id: userInfo.my_device_id,
        },
      }
    )
      .then(async () => {
        res.json({
          message: "유저 정보 업데이트 성공",
          isSuccess: true,
        });
      })
      .catch((err) => {
        res.json({
          message: "실패",
          isSuccess: false,
        });
      });
  } else {
    // DB에 등록되지 않은 유저면, 즉 새로운 사용자면,
    const newUser = new User();

    // 유저 생성
    newUser.id = userInfo.id;
    newUser.nickname = userInfo.nickname;
    newUser.picture = userInfo.picture;
    newUser.email = userInfo.email;
    newUser.total_count = userInfo.total_count;
    newUser.elements = elements;
    newUser.my_device_id = userInfo.my_device_id;

    // 유저, 방 DB에 저장
    await newUser.save().catch((err) => {
      res.json({
        message: "유저 생성 실패",
        isSuccess: false,
      });
    });
    await checkInTheRoom(userInfo.id).then(() => {
      res.json({
        message: "새로운 유저 등록 완료",
        isSuccess: true,
      });
    });
  }
};

module.exports = { login };
