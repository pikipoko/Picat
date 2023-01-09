const User = require("../models/User");

let invite_friends = async function (req, res, next) {
  let isSuccess = true;
  const friend_ids = req.body.friends;
  const room = await User.findOne(
    { id: req.body.id },
    {
      id: 0,
      nickname: 0,
      picture: 0,
      email: 0,
      roomIdx: 1,
      total_count: 0,
      descriptions: 0,
      elements: 0,
    }
  );
  for (let i = 0; i < friend_ids.length; i++) {
    let pre_friend = await User.findOne({ id: friend_ids[i] }).exec();
    if (pre_friend) {
      await User.updateOne(
        { id: friend_ids[i] },
        {
          $set: {
            roomIdx: room,
          },
        }
      );
      console.log(`${pre_friend.nickname}님 - ${room} 공유방으로 이동 완료`);
    } else {
      console.log(`사용자(${friend_ids[i]})를 찾을 수 없습니다.`);
    }
  }

  res.json({
    isSuccess: isSuccess,
  });
};

module.exports = { invite_friends };
