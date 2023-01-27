require("dotenv");

const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");
const AWS = require("aws-sdk");
const rekognition = new AWS.Rekognition({ region: "ap-northeast-2" });

const { requestBlurCheck } = require("./blur");

/**DB에 이미지 저장 */
async function saveImagesInDB(images, uploader) {
  for (let i = 0; i < images.length; i++) {
    const newImg = new Img();
    newImg.roomIdx = uploader.roomIdx;
    newImg.id = uploader.id;
    newImg.url = images[i].location;
    newImg.users = [];
    newImg.isBlur = false;
    await newImg.save().catch((err) => {
      console.log(`| error in saveImagesInDB | uploader : ${uploader} |${err}`);
    });
  }
  console.log(`| ${images.length}장 DB 저장 완료 | ${uploader.id} |`);
}

/**친구 프로필에 얼굴 유무 확인 */
async function checkFriendsProfile(friends) {
  const friendFaceInProfile = [];
  for (let fIdx = 0; fIdx < friends.length; fIdx++) {
    const friendProfile = `users/${friends[fIdx]}.jpg`;
    const detectFriendProfileParam = setDetectParam(friendProfile);
    rekognition.detectFaces(detectFriendProfileParam, function (err, response) {
      if (err) {
        console.log(`friend face detect error - ${friends[fIdx]}`);
        console.log(err, err.stack);
      } else {
        if (response.FaceDetails.length > 0) {
          // console.log(`프로필 사진에 얼굴이 있음 - ${friends[fIdx]}`)
          // 프사 내 얼굴 O
          friendFaceInProfile.push(friends[fIdx]);
        } else {
          // 프사 내 얼굴 X
          // console.log(`프로필 사진에 얼굴이 없음 - ${friends[fIdx]}`)
        }
      }
    });
  }
  return friendFaceInProfile;
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
  friendsInImage,
  isSend
) {
  // console.log(`| ${count}/${works} | ${Message} |`);
  if (count == works && !isSend) {
    console.log(`| ${count} 작업 완료 | ${Message} |`);
    res.json({
      url: imagesURL,
      img_cnt: imagesURL.length,
      friends: friendsInImage,
    });
    return true;
  }

  return isSend;
}

async function uploadImages(req, res, next) {
  let count = 0;
  const resImages = [];
  const friendsInImage = [];
  let isSend = false;

  const imagesToUpload = req.files;
  const uploaderId = parseInt(req.body.id);
  let consoleMessage = `| ${uploaderId} | ${imagesToUpload.length}장 - 얼굴 분류 작업 및 업로드`;

  const uploader = await User.findOne({ id: uploaderId });
  let friends = uploader.elements;
  friends.push(uploaderId);

  /**친구들 프로필 사진에 얼굴이 있는지 없는지 검사 */
  friends = await checkFriendsProfile(friends);

  const room = await Room.findOne({ roomIdx: uploader.roomIdx });

  /*DB에 images 먼저 저장*/
  await saveImagesInDB(imagesToUpload, uploader);

  /*Blur 서버에 images 전달*/
  requestBlurCheck(imagesToUpload);
  for (let i = 0; i < imagesToUpload.length; i++) {
    resImages[i] = imagesToUpload[i].location;
  }
  setTimeout(() => {
    if (!isSend) {
      console.log(
        `${count}/${imagesToUpload.length * friends.length} - 시간 다되서 보냄.`
      );
      res.json({
        url: resImages,
        img_cnt: resImages.length,
        friends: friendsInImage,
      });
      isSend = true;
    }
  }, 20000);
  /*업로드할 이미지 수 만큼 얼굴 탐지 반복 */
  for (let i = 0; i < imagesToUpload.length; i++) {
    // resImages[i] = imagesToUpload[i].location;

    const targetImgName = imagesToUpload[i].location.split("/")[3];
    const detectParam = setDetectParam(targetImgName);

    /**(1)얼굴유무 판단 */
    rekognition.detectFaces(detectParam, async function (err, response) {
      if (err) {
        console.log("detect error");
        console.log(err, err.stack);
        count += friends.length;
        isSend = checkIfAllWorkDone(
          count,
          imagesToUpload.length * friends.length,
          consoleMessage,
          res,
          resImages,
          friendsInImage,
          isSend
        );
      } else {
        //(1)얼굴유무 판단 - O
        if (response.FaceDetails.length > 0) {
          // 사진에 얼굴이 있으면, 친구 목록을 순회하면서 친구 얼굴과 비교함.
          for (let f_i = 0; f_i < friends.length; f_i++) {
            const friendProfile = `users/${friends[f_i]}.jpg`;
            const compareParams = setCompareParam(friendProfile, targetImgName);

            /**(2) 사진 <-> 프사 얼굴 비교*/
            rekognition.compareFaces(
              compareParams,
              async function (err, response) {
                if (err) {
                  console.log("compare error");
                  console.log(err);
                  count++;
                  isSend = checkIfAllWorkDone(
                    count,
                    imagesToUpload.length * friends.length,
                    consoleMessage,
                    res,
                    resImages,
                    friendsInImage,
                    isSend
                  );
                } else {
                  if (response.FaceMatches.length > 0) {
                    // consoleMessage = "얼굴O 친구O"; //(2) 사진 <-> 프사 얼굴 비교 - 친구 O

                    response.FaceMatches.forEach(async (data) => {
                      if (data.Similarity > 90) {
                        if (
                          // friendsInImage.filter(
                          //   (fInImage) => fInImage.id == friends[f_i]
                          // ).length == 0 &&
                          !friendsInImage.find(
                            (obj) => obj.id === friends[f_i]
                          ) &&
                          !room.members.includes(friends[f_i])
                        ) {
                          /**친구 프로필 사진과 사진 속 얼굴의 유사도가 90%가 넘고, */
                          const friend = await User.findOne({
                            id: friends[f_i],
                          }).exec();
                          console.log(`${friend.nickname}`);
                          friendsInImage.push({
                            nickname: friend.nickname,
                            id: friend.id,
                            picture: friend.picture,
                          });
                        }
                      }
                    });
                    await Img.updateOne(
                      { url: imagesToUpload[i].location },
                      { $push: { users: friends[f_i] } }
                    ).then(() => {
                      // consoleMessage = "얼굴O 친구O"; //(2) 사진 <-> 프사 얼굴 비교 - 친구 O
                      count++;
                      isSend = checkIfAllWorkDone(
                        count,
                        imagesToUpload.length * friends.length,
                        consoleMessage,
                        res,
                        resImages,
                        friendsInImage,
                        isSend
                      );
                    });
                  } else {
                    // consoleMessage = "얼굴O 친구X"; //(2) 사진 <-> 프사 얼굴 비교 - 친구 X
                    count++;
                    isSend = checkIfAllWorkDone(
                      count,
                      imagesToUpload.length * friends.length,
                      consoleMessage,
                      res,
                      resImages,
                      friendsInImage,
                      isSend
                    );
                  }
                }
              }
            );
          }
        } else {
          // consoleMessage = "얼굴X"; //(1)얼굴유무 판단 - X
          count += friends.length;
          isSend = checkIfAllWorkDone(
            count,
            imagesToUpload.length * friends.length,
            consoleMessage,
            res,
            resImages,
            friendsInImage,
            isSend
          );
        }
      }
    });
  }
}

module.exports = { uploadImages };
