require("dotenv");
const request = require("request");
const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });

/**DB에 이미지 저장 */
async function saveImagesInDB(images, uploader) {
  for (let i = 0; i < images.length; i++) {
    let preImage = images[i].location;
    const newImg = new Img();
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploader.id;
    newImg.url = preImage;
    newImg.users = [];
    newImg.isBlur = false;
    await newImg.save();
  }
  console.log(`| ${images.length}장 DB 저장 완료 | ${uploader.id} |`);
}

/**서브 서버에 Blur Check 요청 */
function requestBlurCheck(images) {
  console.log(`Sub Server에 흐린 사진 판별 작업 요청`);
  request.post(
    {
      url: "http://3.39.184.45:5000/checkBlur",
      json: { imageURL: images },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print the response from the second server
        console.log(body);
        res.send(body);
      }
    }
  );
}

/**set S3 detect_face Param */
function setDetectParam(imageName) {
  return {
    Image: {
      S3Object: {
        Bucket: process.env.PICAT,
        Name: imageName,
      },
    },
  };
}

/**set S3 compare_faces Param */
function setCompareParam(sourceImageName, targetImageName) {
  return {
    SourceImage: {
      S3Object: {
        Bucket: process.env.PICAT,
        Name: sourceImageName,
      },
    },
    TargetImage: {
      S3Object: {
        Bucket: process.env.PICAT,
        Name: targetImageName,
      },
    },
    SimilarityThreshold: 70,
  };
}

/**check all work done and write console */
function checkIfAllWorkDone(
  count,
  works,
  Message,
  res,
  imagesURL,
  friendsInImage
) {
  // console.log(`| ${count}/${works} | ${Message} |`);
  if (count == works) {
    console.log(`| ${count} 작업 완료 | ${Message} |`);
    res.json({
      url: imagesURL,
      img_cnt: imagesURL.length,
      friends: friendsInImage,
    });
  }
}

async function uploadImage(req, res, next) {
  let count = 0;
  const resImages = [];
  const friendsInImage = [];

  const uploadImages = req.files;
  const uploaderId = parseInt(req.body.id);
  let consoleMessage = `| ${uploaderId} | ${uploadImages.length}장 - 얼굴 분류 작업 및 업로드`;

  const uploader = await User.findOne({ id: uploaderId });
  const friends = uploader.elements;
  friends.push(uploaderId);

  const room = await Room.findOne({ roomIdx: uploader.roomIdx });

  /*DB에 images 먼저 저장*/
  await saveImagesInDB(uploadImages, uploader);

  /*Blur 서버에 images 전달*/
  requestBlurCheck(uploadImages);

  /*업로드할 이미지 수 만큼 얼굴 탐지 반복 */
  for (let iIdx = 0; iIdx < uploadImages.length; iIdx++) {
    let preImage = uploadImages[iIdx].location;
    resImages[iIdx] = preImage;

    const targetImgName = preImage.split("/")[3];
    const detectParam = setDetectParam(targetImgName);

    /**(1)얼굴유무 판단 */
    rekognition.detectFaces(detectParam, async function (err, response) {
      if (err) {
        console.log("detect error");
        console.log(err, err.stack);
        count += friends.length;
      } else {
        //(1)얼굴유무 판단 - O
        if (response.FaceDetails.length > 0) {
          // 사진에 얼굴이 있으면, 친구 목록을 순회하면서 친구 얼굴과 비교함.
          for (let fIdx = 0; fIdx < friends.length; fIdx++) {
            const friendProfile = `users/${friends[fIdx]}.jpg`;
            const friendDetectParam = setDetectParam(friendProfile);

            /**(2)프사 내 얼굴 유무 판단 */
            rekognition.detectFaces(
              friendDetectParam,
              async function (err, response) {
                if (err) {
                  console.log("friend face detect error");
                  console.log(err, err.stack);
                  count++;
                } else {
                  //(2)프사 내 얼굴 유무-O
                  if (response.FaceDetails.length > 0) {
                    const compareParams = setCompareParam(
                      friendProfile,
                      targetImgName
                    );

                    /**(3) 사진 <-> 프사 얼굴 비교*/
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
                                    (friend) => friend.id == friends[fIdx]
                                  ).length == 0 &&
                                  !room.members.includes(friends[fIdx])
                                ) {
                                  const friend = await User.findOne({
                                    id: friends[fIdx],
                                  }).exec();

                                  friendsInImage.push({
                                    nickname: friend.nickname,
                                    id: friend.id,
                                    picture: friend.picture,
                                  });
                                }
                              }
                            });
                            await Img.updateOne(
                              { url: preImage },
                              { $push: { users: friends[fIdx] } }
                            ).then(() => {
                              // consoleMessage = "얼굴O 친구O"; //(3) 사진 <-> 프사 얼굴 비교 - 친구 O
                              count++;
                              checkIfAllWorkDone(
                                count,
                                uploadImages.length * friends.length,
                                consoleMessage,
                                res,
                                resImages,
                                friendsInImage
                              );
                            });
                          } else {
                            // consoleMessage = "얼굴O 친구X"; //(3) 사진 <-> 프사 얼굴 비교 - 친구 X
                            count++;
                            checkIfAllWorkDone(
                              count,
                              uploadImages.length * friends.length,
                              consoleMessage,
                              res,
                              resImages,
                              friendsInImage
                            );
                          }
                        }
                      }
                    );
                  } else {
                    // consoleMessage = "친구 프사에 얼굴X"; //(2)프사 내 얼굴 유무-X
                    count++;
                    checkIfAllWorkDone(
                      count,
                      uploadImages.length * friends.length,
                      consoleMessage,
                      res,
                      resImages,
                      friendsInImage
                    );
                  }
                }
              }
            );
          }
        } else {
          // consoleMessage = "얼굴X"; //(1)얼굴유무 판단 - X
          count += friends.length;
          checkIfAllWorkDone(
            count,
            uploadImages.length * friends.length,
            consoleMessage,
            res,
            resImages,
            friendsInImage
          );
        }
      }
    });
  }
}

module.exports = { uploadImage };
