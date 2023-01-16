const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
// const compareFaces = require("../config/compareFaces");
////
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });

async function uploadImage(req, res, next) {
  console.log(
    "==========================================================================================="
  );
  let count = 0;
  let resImages = [];

  const images = req.files;
  const uploaderId = parseInt(req.body.id);
  let friendsInImage = [];

  const uploader = await User.findOne({ id: uploaderId });
  const uploaderFriends = uploader.elements;
  uploaderFriends.push(uploaderId);
  const room = await Room.findOne({ roomIdx: uploader.roomIdx });
  const roomMembers = room.members;

  for (let imageIdx = 0; imageIdx < images.length; imageIdx++) {
    let preImage = images[imageIdx].location;
    resImages[imageIdx] = preImage;
    let usersInImage = [];

    // 사진도 유저와 같은 방에 있어야 함.
    const newImg = new Img();
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploaderId;
    newImg.url = preImage;
    newImg.users = usersInImage;
    await newImg.save().then(() => {
      console.log(`${count} DB 저장 완료`);
      count++;
      if (count == images.length * (uploaderFriends.length + 1)) {
        console.log(`${count} 처음 save res 보냄`);
        res.json({
          url: resImages,
          img_cnt: images.length,
          friends: friendsInImage,
        });
      }
    });

    let detectParams = {
      Image: {
        S3Object: {
          Bucket: "picat-3rd",
          Name: uploader.roomIdx.toString() + "/" + preImage.split("/")[4],
        },
      },
    };

    rekognition.detectFaces(detectParams, async function (err, response) {
      if (err) {
        console.log("detect error");
        console.log(err, err.stack);
      } else {
        for (
          let friendIdx = 0;
          friendIdx < uploaderFriends.length;
          friendIdx++
        ) {
          const compareParams = {
            SourceImage: {
              S3Object: {
                Bucket: "picat-3rd",
                Name: `users/${uploaderFriends[friendIdx]}.jpg`,
              },
            },
            TargetImage: {
              S3Object: {
                Bucket: "picat-3rd",
                Name:
                  uploader.roomIdx.toString() + "/" + preImage.split("/")[4],
              },
            },
            SimilarityThreshold: 70,
          };
          if (response.FaceDetails.length > 0) {
            rekognition.compareFaces(
              compareParams,
              async function (err, response) {
                if (err) {
                  console.log("compare error");
                  console.log(err);
                } else {
                  if (response.FaceMatches.length > 0) {
                    response.FaceMatches.forEach(async (data) => {
                      console.log(data.Similarity);
                      if (data.Similarity > 90) {
                        if (
                          friendsInImage.filter(
                            (friend) => friend.id == uploaderFriends[friendIdx]
                          ).length == 0 &&
                          !roomMembers.includes(uploaderFriends[friendIdx])
                        ) {
                          let friend = await User.findOne({
                            id: uploaderFriends[friendIdx],
                          }).exec();

                          friendsInImage.push({
                            nickname: friend.nickname,
                            id: friend.id,
                            picture: friend.picture,
                          });
                        }
                        if (
                          !usersInImage.includes(uploaderFriends[friendIdx])
                        ) {
                          usersInImage.push(uploaderFriends[friendIdx]);
                        }
                      }

                      newImg.users = usersInImage;
                    });
                    await Img.updateOne(
                      {
                        url: preImage,
                      },
                      {
                        $push: {
                          users: uploaderFriends[friendIdx],
                        },
                      }
                    ).then(() => {
                      console.log(
                        `| ${count} | ${imageIdx} | ${friendIdx} |DB 업데이트 완료`
                      );
                      count++;
                      if (
                        count ==
                        images.length * (uploaderFriends.length + 1)
                      ) {
                        console.log(`${count} update 후 res 보냄`);
                        res.json({
                          url: resImages,
                          img_cnt: images.length,
                          friends: friendsInImage,
                        });
                      }
                    });
                  } else {
                    count++;
                    console.log(`${count} 친구X`);
                    if (count == images.length * (uploaderFriends.length + 1)) {
                      console.log(`${count} 친구X res 보냄`);
                      res.json({
                        url: resImages,
                        img_cnt: images.length,
                        friends: friendsInImage,
                      });
                    }
                  }
                }
              }
            );
          } else {
            count++;
            console.log(`${count} 얼굴X`);
            if (count == images.length * (uploaderFriends.length + 1)) {
              console.log(`${count} 얼굴X res 보냄`);
              res.json({
                url: resImages,
                img_cnt: images.length,
                friends: friendsInImage,
              });
            }
          }
        }
      }
    });
  }
}

module.exports = { uploadImage };
