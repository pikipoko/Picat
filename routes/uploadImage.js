const User = require("../models/User");
const Img = require("../models/Image");
// const compareFaces = require("../config/compareFaces");

const AWS = require("aws-sdk");
const client = new AWS.Rekognition({ region: "ap-northeast-2" });

let uploadImage = async function (req, res, next) {
  try {
    const data = req.files;
    let images = [];
    let imgCnt = 0;
    let friendsInImage = [];
    let users = [];

    for (let i = 0; i < data.length; i++) {
      /* mongo DB에 id, url 저장하는 코드 추가 필요 */
      const newImg = new Img();
      const id = parseInt(req.body.id);

      // user : 사진을 업로드한 유저
      let user = await User.findOne({ id: id }).exec();

      // 사진에서 친구들을 찾아야 함.

      // 사진도 유저와 같은 방에 있어야 함.
      let roomIdx = user.roomIdx;

      newImg.roomIdx = roomIdx;
      newImg.id = id;
      newImg.url = data[i].location;

      console.log(user.elements);
      // friends 찾아서 friends에 저장
      for (let j = 0; j < user.elements.length; j++) {
        const params = {
          SourceImage: {
            S3Object: {
              Bucket: "picat-2nd",
              Name: `users/${user.elements[j]}.jpg`,
            },
          },
          TargetImage: {
            S3Object: {
              Bucket: "picat-2nd",
              Name: newImg.url.split("/")[3],
            },
          },
          SimilarityThreshold: 70,
        };
        await client
          .compareFaces(params, function (err, response) {
            if (err) {
              console.log(err, err.stack); // an error occurred
            } else {
              response.FaceMatches.forEach((data) => {
                if (data.Similarity > 90) {
                  if (!friendsInImage.includes(user.elements[j])) {
                    console.log(friendsInImage, user.elements[j]);
                    friendsInImage.push(user.elements[j]);
                  }

                  users.push(user.elements[j]);
                  // console.log(`${isFaceInImage} ${similarity}`);
                }
              }); // for response.faceDetails
            } // if
          })
          .promise();
      }
      newImg.users = users;
      images[imgCnt] = data[i].location;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then(async (user) => {
          console.log(`[${imgCnt}] DB저장`);
          imgCnt++;
        })
        .catch((err) => {
          // res.json({
          //   message: "이미지 생성정보 db저장실패",
          // });
          console.log(`[${imgCnt}] DB저장 실패`);
          console.error(err);
        });
    }

    console.log(`[${imgCnt}] DB저장 - 찾은 친구`);
    res.json({
      url: images,
      img_cnt: imgCnt,
      friends: friendsInImage,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = { uploadImage };
