const User = require("../models/User");
const Img = require("../models/Image");

let filter = async function (req, res, next) {
  const filterId = parseInt(req.query.id);
  const userRoom = await User.findOne(
    { id: filterId },
    { _id: 0, roomIdx: 1 }
  ).exec();

  // const url=[];
  Img.find(
    // { users: { $in: [filterId] }, roomIdx: userRoom.roomIdx },//고른사람의 현재 방 고려
    { users: { $in: [filterId] } },
    (err, docs) => {
      // docs will contain all documents where the failed array contains the id
      const url = docs.map((obj) => obj.url);
      console.log("--------------------------------------------------");
      console.log(
        `filter : cnt-${url.length} | Id-${filterId} | room-${userRoom.roomIdx}`
      );
      console.log("--------------------------------------------------");
      res.json({
        url: url,
      });
    }
  );
};

module.exports = { filter };
