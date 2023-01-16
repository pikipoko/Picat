const User = require("../models/User");
const Room = require("../models/Room");
const { checkOutTheRoom, checkInTheRoom } = require("../config/checkInOut");
const pushAlarm = require("./pushAlarm");

let inviteFriends = async function (req, res, next) {
  let isSuccess = true;
  let friendsReq = req.body.friends;
  console.log(`request 받은 친구 목록 : ${friendsReq} ${typeof friendsReq}`);
  if (typeof friendsReq == typeof "typeString") {
    console.log(`string을 [ 숫자 ]로 바꿔줌`);
    friendsReq = [parseInt(req.body.friends)];
  }

  const host = await User.findOne({ id: req.body.id }).exec();
  if (host) {
    const hostRoom = await Room.findOne({ roomIdx: host.roomIdx });
    const newMembers = hostRoom.members;

    for (let i = 0; i < friendsReq.length; i++) {
      preFriend = parseInt(friendsReq[i]);
      const preUser = await User.findOne({ id: preFriend });
      await checkOutTheRoom(preFriend);
      await User.findOneAndUpdate(
        { id: preFriend },
        { $set: { roomIdx: hostRoom.roomIdx } }
      ).then(() => {
        console.log(`${preFriend} 유저 업데이트 완료, 푸시알람 시작`);
        if (!newMembers.includes(preFriend)) {
          newMembers.push(preFriend);
        }
        pushAlarm(
          preUser.my_device_id,
          `Picat 초대 알림`,
          `${host.nickname}님이 초대하였습니다.`
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
