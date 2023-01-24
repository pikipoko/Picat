require("dotenv");
const request = require("request");
const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });

async function saveImagesInDB(images, uploader) {
  for (let i = 0; i < images.length; i++) {
    let preImage = images[i].location;
    const newImg = new Img()
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploader.id;
    newImg.url = preImage;
    newImg.users = [];
    newImg.isBlur = false;
    await newImg.save().then(() => {
      console.log(`| ${uploader.id} | ${i} DB 저장 완료`)
    })
  }
}

function requestBlurCheck(images) {
  request.post({
    url: "http://3.39.184.45:5000/checkBlur",
    json: { imageURL: images },
  },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print the response from the second server
        console.log(body);
        res.send(body);
      }
    })
}

function setDetectParam(imageName) {
  return {
    Image: {
      S3Object: {
        Bucket: process.env.PICAT,
        Name: imageName
      }
    }
  }
}

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
  }
}

function checkIfAllWorkDone(count, countIncrement, imagesLength, friendsLength, printMessage, res, imagesURL, friendsInImage) {
  count += countIncrement;
  console.log(`|${count}| ${printMessage} |`);
  if (count == imagesLength * friendsLength) {
    res.json({
      url: imagesURL,
      img_cnt: imagesLength,
      friends: friendsInImage
    })
  }
}

async function findFriendsInImage(preImage, friends, friendProfile, targetImgName, friendsInImage, roomMembers, resImages, ImagesLength, res) {
  //(2)프사 내 얼굴 유무-O
  const compareParams = setCompareParam(friendProfile, targetImgName)

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
              if (friendsInImage.filter((friend) => friend.id == friends[fIdx]).length == 0 && !roomMembers.includes(friends[fIdx])) {
                const friend = await User.findOne({
                  id: friends[fIdx],
                }).exec();

                friendsInImage.push({
                  nickname: friend.nickname,
                  id: friend.id,
                  picture: friend.picture,
                });

                await Img.updateOne({url: preImage}, {$push: {users: friends[fIdx]}})
                .then(() => {
                  consoleMessage = "얼굴O 친구O DB 업데이트 완료";
                  checkIfAllWorkDone(count, 1, ImagesLength, friends.length, consoleMessage, res, resImages, friendsInImage)
                });
              }
            }
          });
        } else {
          //(3) 사진 <-> 프사 얼굴 비교 - 친구 X
          consoleMessage = "얼굴O 친구X DB 업데이트 완료";
          checkIfAllWorkDone(count, 1, ImagesLength, friends.length, consoleMessage, res, resImages, friendsInImage)
        }
      }
    }
  );
}

async function uploadImage(req, res, next) {
  let count = 0;
  let consoleMessage = "upload시작";
  const resImages = [];
  const friendsInImage = [];

  const uploadImages = req.files;
  const uploaderId = parseInt(req.body.id);

  const uploader = await User.findOne({ id: uploaderId });
  const friends = uploader.elements;
  friends.push(uploaderId);

  const room = await Room.findOne({ roomIdx: uploader.roomIdx });
  const roomMembers = room.members;

  /*DB에 images 먼저 저장*/
  await saveImagesInDB(uploadImages, uploader);

  /*Blur 서버에 images 전달*/
  requestBlurCheck(uploadImages);

  /*업로드할 이미지 수 만큼 얼굴 탐지 반복 */
  for (let iIdx = 0; iIdx < uploadImages.length; iIdx++) {
    let preImage = uploadImages[iIdx].location;
    resImages[iIdx] = preImage;

    const targetImgName = preImage.split("/")[3];
    const detectParam = setDetectParam(targetImgName)

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
            const friendProfile = `users/${friends[fIdx]}.jpg`
            const friendDetectParam = setDetectParam(friendProfile)

            /**(2)프사 내 얼굴 유무 판단 */
            rekognition.detectFaces(friendDetectParam, async function (err, response) {
              if (err) {
                console.log("friend face detect error");
                console.log(err, err.stack);
                count++;
              } else {
                if (response.FaceDetails.length > 0) {
                  await findFriendsInImage(preImage, friends, friendProfile, targetImgName, friendsInImage, roomMembers, resImages, res)
                } else {
                  //(2)프사 내 얼굴 유무-X
                  consoleMessage = "친구 프사에 얼굴 X";
                  checkIfAllWorkDone(count, 1, uploadImages.length, friends.length, consoleMessage, res, resImages, friendsInImage)
                }
              }
            });
          }
        } else {
          //(1)얼굴유무 판단 - X
          consoleMessage = "업로드하려는 사진에 얼굴 X";
          checkIfAllWorkDone(count, friends.length, uploadImages.length, friends.length, consoleMessage, res, resImages, friendsInImage)
        }
      }
    });
  }
  console.log(`=====================================`);
}

module.exports = { uploadImage };
