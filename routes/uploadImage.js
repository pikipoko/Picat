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
    // 사진에서 친구들을 찾아야 함.
    let friendsInImage = [];
    const id = parseInt(req.body.id);
    const user = await User.findOne({ id: id }).exec();
    // user : 사진을 업로드한 유저
    let roomIdx = user.roomIdx;

    for (let i = 0; i < data.length; i++) {
      /* mongo DB에 id, url 저장하는 코드 추가 필요 */
      const newImg = new Img();
      let usersInImage = [];

      // 사진도 유저와 같은 방에 있어야 함.
      newImg.roomIdx = roomIdx;
      newImg.id = id;
      newImg.url = data[i].location;

      console.log(user.elements);
      // friends 찾아서 friends에 저장
      for (let j = 0; j < user.elements.length; j++) {
        if (user.elements[j] && newImg.url) {
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
                console.log(`얼굴 못 찾음!!!`);
                // console.log(err, err.stack); // an error occurred
              } else {
                response.FaceMatches.forEach(async (data) => {
                  if (data.Similarity > 90) {
                    // if (!friendsInImage.includes({ id: user.elements[j] })) {
                    if (
                      friendsInImage.filter(function (friend) {
                        return friend.id == user.elements[j];
                      }).length == 0
                    ) {
                      let friend = await User.findOne({
                        id: user.elements[j],
                      }).exec();

                      friendsInImage.push({
                        nickname: friend.nickname,
                        id: user.elements[j],
                        picture: friend.picture,
                      });
                    }
                    if (!usersInImage.includes(user.elements[j])) {
                      usersInImage.push(user.elements[j]);
                      await Img.updateOne(
                        { url: newImg.url },
                        { $set: { users: usersInImage } }
                      );
                    }
                    // console.log(friendsInImage, user.elements[j]);
                  }
                }); // for response.faceDetails
              } // if
            })
            .promise();
        } else {
          console.log(
            `error - invalid | ${user.elements[j]} | ${newImg.url} |`
          );
        }
      }
      // newImg.users = usersInImage;
      images[imgCnt] = data[i].location;
      newImg.users = usersInImage;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then(async (user) => {
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
