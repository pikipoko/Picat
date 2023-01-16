const User = require("../models/User");
const Room = require("../models/Room");
const { checkOutTheRoom, checkInTheRoom } = require("../config/checkInOut");
const pushAlarm = require("./pushAlarm");

let inviteFriends = async function (req, res, next) {
  let isSuccess = true;
  const friends = req.body.friends;

  const host = await User.findOne({ id: req.body.id }).exec();
  if (host) {
    const hostRoom = await Room.findOne({ roomIdx: host.roomIdx });
    const newMembers = hostRoom.members;

    for (let i = 0; i < friends.length; i++) {
      await checkOutTheRoom(friends[i]);
      const preFriend = await User.findOneAndUpdate(
        { id: friends[i] },
        { $set: { roomIdx: hostRoom.roomIdx } }
      ).then(() => {
        console.log(`${friends[i]} 유저 업데이트 완료, 푸시알람 시작`);
        if (!newMembers.includes(friends[i])) {
          newMembers.push(friends[i]);
        }
        pushAlarm(
          preFriend.my_device_id,
          `${preFriend.nickname}에게 보내는 푸시알람`,
          `${host.nickname}님이 ${host.roomIdx} 방으로 초대`
        );
      });
    }
    // 호스트 방 업데이트
    await Room.updateOne(
      { roomIdx: host.roomIdx },
      {
        $set: {
          members: newMembers,
          roomMemberCnt: newMembers.length,
        },
      }
    );

    res.json({
      isSuccess: isSuccess,
    });
  } else {
    isSuccess = false;
    res.json({
      isSuccess: isSuccess,
    });
  }
};

module.exports = { inviteFriends };
