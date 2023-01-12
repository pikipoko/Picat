require("dotenv").config;
const fetch = require("node-fetch");
const User = require("../models/User");
const AWS = require("aws-sdk");

const fs = require("fs");
const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});

const uploadImageToS3 = (imageUrl, fileName) => {
  return new Promise((resolve, reject) => {
    fetch(imageUrl).then((res) => {
      res.body.pipe(fs.createWriteStream("temp.jpg")).on("finish", (data) => {
        const param = {
          Bucket: "picat",
          Key: fileName,
          ACL: "public-read",
          Body: fs.createReadStream("temp.jpg"),
          ContentType: "image/jpg",
        };

        s3.upload(param, (error, data) => {
          if (error) {
            console.log("upload s3 error", error);
          }
          console.log(data);
        });
      });
    });
  });
};

let login = async function (req, res, next) {
  const userInfo = req.body;

  const findUser = await User.findOne({ id: req.body.id }).exec();

  /**친구 id 저장 */
  const elements = [];
  for (let i = 0; i < userInfo.elements.length; i++) {
    elements.push(userInfo.elements[i].id);
  }

  /**기존 사용자면 업데이트 */
  if (findUser) {
    await User.updateOne(
      { id: req.body.id },
      {
        $set: {
          nickname: userInfo.nickname,
          picture: userInfo.picture,
          total_count: userInfo.total_count,
          email: userInfo.email,
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
    await uploadImageToS3(userInfo.picture, userInfo.picture);

    newUser.id = userInfo.id;
    newUser.roomIdx = userInfo.id;
    newUser.nickname = userInfo.nickname;
    newUser.picture = userInfo.picture;
    newUser.email = userInfo.email;
    newUser.total_count = userInfo.total_count;
    newUser.elements = elements;
    console.log(newUser);
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
};

module.exports = { login };
