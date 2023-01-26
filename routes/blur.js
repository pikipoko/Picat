require("dotenv");
const request = require("request");
const User = require("../models/User");
const Img = require("../models/Image");

/**서브 서버에 Blur Check 요청 */
function requestBlurCheck(images) {
  console.log(`| ${images.length} | 흐린 사진 판별 작업 요청`);
  request.post(
    {
      url: process.env.BLURCHECK_SERVER,
      json: { imageURL: images },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print the response from the second server
        console.log("흐린 사진 판별 서버에서 에러 발생", body);
        res.send(body);
      }
    }
  );
}

let blur = async function (req, res, next) {
  const blurId = parseInt(req.query.id);
  const userRoom = await User.findOne(
    { id: blurId },
    { _id: 0, roomIdx: 1 }
  ).exec();
  Img.find(
    { isBlur: true, roomIdx: userRoom.roomIdx }, //고른사람의 현재 방 고려
    (err, docs) => {
      // docs will contain all documents where the failed array contains the id
      const url = docs.map((obj) => obj.url);
      console.log(
        `blur : blur_cnt-${url.length} | bluer 요청 Id-${blurId} | room-${userRoom.roomIdx}`
      );
      res.json({
        url: url,
      });
    }
  );
};

let clear = async function (req, res, next) {
  const blurId = parseInt(req.query.id);
  const userRoom = await User.findOne(
    { id: blurId },
    { _id: 0, roomIdx: 1 }
  ).exec();
  Img.find(
    { isBlur: false, roomIdx: userRoom.roomIdx }, //고른사람의 현재 방 고려
    (err, docs) => {
      // docs will contain all documents where the failed array contains the id
      const url = docs.map((obj) => obj.url);
      console.log(
        `clear : clear_cnt-${url.length} | clear 요청 Id-${blurId} | room-${userRoom.roomIdx}`
      );
      res.json({
        url: url,
      });
    }
  );
};

module.exports = { blur, clear, requestBlurCheck };