require("dotenv");
const request = require("request");
const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });

async function uploadImage(req, res, next) {
  let count = 0;
  const resImages = [];
  // const blurImages = [];

  const images = req.files;
  const uploaderId = parseInt(req.body.id);
  const friendsInImage = [];

  const uploader = await User.findOne({ id: uploaderId });
  const uploaderFriends = uploader.elements;
  uploaderFriends.push(uploaderId);
  const room = await Room.findOne({ roomIdx: uploader.roomIdx });
  const roomMembers = room.members;

  /*********Blur 서버 요청 */
  /*DB에 images 먼저 저장*/
  for (let imageIdx = 0; imageIdx < images.length; imageIdx++) {
    let preImage = images[imageIdx].location;
    const newImg = new Img();
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploaderId;
    newImg.url = preImage;
    newImg.users = [];
    newImg.isBlur = false;
    await newImg.save().then(() => {
      console.log(`| ${uploader.nickname} | ${count} DB 저장 완료`);
      count++;
    });
  }
  /*Blur 서버에 images 전달*/
  request.post(
    {
      url: "http://3.39.184.45:5000/checkBlur",
      json: { imageURL: images, roomIdx: uploader.roomIdx },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print the response from the second server
        console.log(body);
        res.send(body);
      }
    }
  );
  /**업로드 이미지 수 만큼 반복 */
  for (let imageIdx = 0; imageIdx < images.length; imageIdx++) {
    let preImage = images[imageIdx].location;
    resImages[imageIdx] = preImage;
    let usersInImage = [];
    // resImages.push(preImage);

    // 사진도 유저와 같은 방에 있어야 함.
    // const newImg = new Img();
    // newImg.roomIdx = uploader.roomIdx;
    // newImg.id = uploaderId;
    // newImg.url = preImage;
    // newImg.users = usersInImage;
    // newImg.isBlur = false;
    // await newImg.save().then(() => {
    //   console.log(`| ${uploader.nickname} | ${count} DB 저장 완료`);
    //   count++;
    // });

    const targetImgName = preImage.split("/")[3];
    let detectParams = {
      Image: {
        S3Object: {
          Bucket: process.env.PICAT,
          Name: targetImgName,
        },
      },
    };
    /**(1)얼굴유무 판단 */
    rekognition.detectFaces(detectParams, async function (err, response) {
      if (err) {
        console.log("detect error");
        console.log(err, err.stack);
        count += uploaderFriends.length;
      } else {
        if (response.FaceDetails.length > 0) {
          //(1)얼굴유무 판단 - O
          for (
            //친구 수 만큼 반복
            let friendIdx = 0;
            friendIdx < uploaderFriends.length;
            friendIdx++
          ) {
            const targetImgName = preImage.split("/")[3];
            let friendDetectParams = {
              Image: {
                S3Object: {
                  Bucket: process.env.PICAT,
                  Name: `users/${uploaderFriends[friendIdx]}.jpg`,
                },
              },
            };
            /**(2)프사 내 얼굴 유무 판단 */
            rekognition.detectFaces(
              //
              friendDetectParams,
              async function (err, response) {
                if (err) {
                  console.log("friend face detect error");
                  console.log(err, err.stack);
                  count++;
                } else {
                  if (response.FaceDetails.length > 0) {
                    //(2)프사 내 얼굴 유무-O
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
                    /**(3) 사진 <-> 프사 얼굴 비교*/
                    rekognition.compareFaces(
                      compareParams,
                      async function (err, response) {
                        if (err) {
                          console.log("compare error");
                          console.log(err);
                        } else {
                          if (response.FaceMatches.length > 0) {
                            //(3) 사진 <-> 프사 얼굴 비교 - 친구 O
                            response.FaceMatches.forEach(async (data) => {
                              if (data.Similarity > 90) {
                                if (
                                  friendsInImage.filter(
                                    (friend) =>
                                      friend.id == uploaderFriends[friendIdx]
                                  ).length == 0 &&
                                  !roomMembers.includes(
                                    uploaderFriends[friendIdx]
                                  )
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
                                  !usersInImage.includes(
                                    uploaderFriends[friendIdx]
                                  )
                                ) {
                                  usersInImage.push(uploaderFriends[friendIdx]);
                                }
                              }

                              // newImg.users = usersInImage;
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
                                `| ${uploader.id} | ${count} | ${imageIdx} | ${friendIdx} |DB 업데이트 완료`
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
                                  // blurImages: blurImages,
                                });
                              }
                            });
                          } else {
                            //(3) 사진 <-> 프사 얼굴 비교 - 친구 X
                            count++;
                            console.log(
                              `| ${uploader.id} | ${count} | ${imageIdx} | ${friendIdx} | 친구X`
                            );
                            if (
                              count ==
                              images.length * (uploaderFriends.length + 1)
                            ) {
                              // console.log(`${count} 친구X res 보냄`);
                              res.json({
                                url: resImages,
                                img_cnt: images.length,
                                friends: friendsInImage,
                                // blurImages: blurImages,
                              });
                            }
                          }
                        }
                      }
                    );
                  } else {
                    //(2)프사 내 얼굴 유무-X
                    count++;
                    if (count == images.length * (uploaderFriends.length + 1)) {
                      // console.log(`${count} update 후 res 보냄`);
                      res.json({
                        url: resImages,
                        img_cnt: images.length,
                        friends: friendsInImage,
                        // blurImages: blurImages,
                      });
                    }
                  }
                }
              }
            );
          }
        } else {
          //(1)얼굴유무 판단 - X
          count += uploaderFriends.length;
          console.log(`| ${uploader.id} | ${count} | ${imageIdx} 얼굴X`);
          if (count == images.length * (uploaderFriends.length + 1)) {
            // console.log(`${count} 얼굴X res 보냄`);
            res.json({
              url: resImages,
              img_cnt: images.length,
              friends: friendsInImage,
              // blurImages: blurImages,
            });
          }
        }
      }
    });
  }
  console.log(`=====================================`);
}

module.exports = { uploadImage };
