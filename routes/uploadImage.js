require("dotenv");
const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });
const {isBlur} = require("./isBlur")


async function uploadImage(req, res, next) {
  let count = 0;
  const resImages = [];
  const blurImages = [];

  const images = req.files;
  const uploaderId = parseInt(req.body.id);
  const friendsInImage = [];

  const uploader = await User.findOne({ id: uploaderId });
  const uploaderFriends = uploader.elements;
  uploaderFriends.push(uploaderId);
  const room = await Room.findOne({ roomIdx: uploader.roomIdx });
  const roomMembers = room.members;

  for (let imageIdx = 0; imageIdx < images.length; imageIdx++) {
    let preImage = images[imageIdx].location;
    let usersInImage = [];

    // 사진도 유저와 같은 방에 있어야 함.
    const newImg = new Img();
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploaderId;
    newImg.url = preImage;
    newImg.users = usersInImage;
    newImg.isBlur = false;
    const isB = await isBlur(preImage)
    if(isB){
      blurImages.push(preImage);
      newImg.isBlur = true;
    } else{
      resImages.push(preImage);
    }
    await newImg.save().then(() => {
      console.log(`| ${uploader.nickname} | ${count} DB 저장 완료`);
      count++;
      if (count == images.length * (uploaderFriends.length + 1)) {
        // if (count == images.length) {
        // console.log(`${count} 처음 save res 보냄`);
        res.json({
          url: resImages,
          img_cnt: images.length,
          friends: friendsInImage,
          blurImages: blurImages
        });
      }
    });

    const targetImgName = preImage.split("/")[3];
    let detectParams = {
      Image: {
        S3Object: {
          Bucket: process.env.PICAT,
          Name: targetImgName,
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
                Bucket: process.env.PICAT,
                Name: `users/${uploaderFriends[friendIdx]}.jpg`,
              },
            },
            TargetImage: {
              S3Object: {
                Bucket: process.env.PICAT,
                Name: targetImgName,
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
                        `| ${uploader.nickname} | ${count} | ${imageIdx} | ${friendIdx} |DB 업데이트 완료`
                      );
                      count++;
                      if (
                        count ==
                        images.length * (uploaderFriends.length + 1)
                      ) {
                        // console.log(`${count} update 후 res 보냄`);
                        res.json({
                          url: resImages,
                          img_cnt: images.length,
                          friends: friendsInImage,
                          blurImages: blurImages
                        });
                      }
                    });
                  } else {
                    count++;
                    console.log(
                      `| ${uploader.nickname} | ${count} | ${imageIdx} | ${friendIdx} | 친구X`
                    );
                    if (count == images.length * (uploaderFriends.length + 1)) {
                      // console.log(`${count} 친구X res 보냄`);
                      res.json({
                        url: resImages,
                        img_cnt: images.length,
                        friends: friendsInImage,
                        blurImages: blurImages
                      });
                    }
                  }
                }
              }
            );
          } else {
            count++;
            console.log(
              `| ${uploader.nickname} | ${count} | ${imageIdx} | ${friendIdx} | 얼굴X`
            );
            if (count == images.length * (uploaderFriends.length + 1)) {
              // console.log(`${count} 얼굴X res 보냄`);
              res.json({
                url: resImages,
                img_cnt: images.length,
                friends: friendsInImage,
                blurImages: blurImages
              });
            }
          }
        }
      }
    });

  }
  /**rekog 제외 test */
  // res.json({
  //   url: resImages,
  //   img_cnt: images.length,
  //   friends: friendsInImage,
  // });
  /**rekog 제외 test */
  console.log(`=====================================`);
}

module.exports = { uploadImage };
