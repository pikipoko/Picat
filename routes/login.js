require("dotenv").config;
const fetch = require("node-fetch");
const User = require("../models/User");
const Room = require("../models/Room");
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
      res.body
        .pipe(fs.createWriteStream(`config/users/${fileName}.jpg`))
        .on("finish", async (data) => {
          const param = {
            Bucket: "picat-2nd",
            Key: `users/${fileName}.jpg`, // s3 bucket 에다가 다운.
            ACL: "public-read",
            Body: fs.createReadStream(`config/users/${fileName}.jpg`), // 우리 서버에다가 다운
            ContentType: "image/jpg",
          };

          await s3.upload(param, (error, data) => {
            if (error) {
              console.log("upload s3 error", error);
            }
          });
        });
    });
  });
};

let login = async function (req, res, next) {
  const userInfo = req.body;
  const findUser = await User.findOne({ id: req.body.id }).exec();
  const findRoom = await Room.findOne({ roomIdx: req.body.id }).exec();

  /**친구 id 저장 */
  const elements = [];
  for (let i = 0; i < userInfo.elements.length; i++) {
    elements.push(userInfo.elements[i].id);
  }

  /**기존 사용자면 업데이트 */
  if (findUser) {
    uploadImageToS3(userInfo.picture, userInfo.id);
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
    ).then(async () => {
      if (!findRoom) {
        const newRoom = new Room();
        // 방 생성
        newRoom.roomIdx = userInfo.id;
        newRoom.roomMemberCnt = 1;
        newRoom.members = [userInfo.id];
        await newRoom
          .save()
          .then(() => {
            res.json({
              message: "유저 및 방 생성 성공",
              isSuccess: true,
            });
          })
          .catch((err) => {
            res.json({
              message: "방 생성 실패",
              isSuccess: false,
            });
          });
      } else {
        res.json({
          message: "유저 정보 업데이트 성공",
          isSuccess: true,
        });
      }
    });
  } else {
    // DB에 등록되지 않은 유저면, 즉 새로운 사용자면,
    const newRoom = new Room();
    const newUser = new User();
    uploadImageToS3(userInfo.picture, userInfo.id);

    // 방 생성
    newRoom.roomIdx = userInfo.id;
    newRoom.roomMemberCnt = 1;
    newRoom.members = [userInfo.id];

    // 유저 생성
    newUser.id = userInfo.id;
    newUser.roomIdx = userInfo.id;
    newUser.nickname = userInfo.nickname;
    newUser.picture = userInfo.picture;
    newUser.email = userInfo.email;
    newUser.total_count = userInfo.total_count;
    newUser.elements = elements;

    // 유저, 방 DB에 저장
    await newUser
      .save()
      .then(async () => {
        if (findRoom) {
          await Room.updateOne(
            { roomIdx: req.body.id },
            {
              $set: {
                roomMemberCnt: newRoom.roomMemberCnt,
                members: newRoom.members,
              },
            }
          ).then(() => {
            res.json({
              message: "유저 및 방 생성 성공!",
              isSuccess: true,
            });
          });
        } else {
          await newRoom
            .save()
            .then(() => {
              res.json({
                message: "유저 및 방 생성 성공",
                isSuccess: true,
              });
            })
            .catch((err) => {
              res.json({
                message: "방 생성 실패",
                isSuccess: false,
              });
            });
        }
      })
      .catch((err) => {
        res.json({
          message: "유저 생성 실패",
          isSuccess: false,
        });
      });
  }
};

module.exports = { login };
