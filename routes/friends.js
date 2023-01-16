const User = require("../models/User");
const Room = require("../models/Room");
const { checkOutTheRoom, checkInTheRoom } = require("../config/checkInOut");
const pushAlarm = require("./pushAlarm");

// 친구 한 명이 초대를 수락했을 때, 그 친구를 수락한 방으로 이동시키는 작업.
const inviteFriends = async function (req, res, next) {
  const userInfo = req.body;
  /* req.body
   * id - 초대받은 사람
   * roomIdx - 초대 수락 후 이동할 방
   */

  // 기존 방 나감.
  await checkOutTheRoom(userInfo.id);

  // 초대 받은 방으로 이동
  // 갈 방에 초대받은 사람 추가
  const roomToGo = await findOne({ roomIdx: userInfo.roomIdx }).exec();
  roomToGo.members.push(userInfo.id);
  await updateOne(
    { roomIdx: userInfo.roomIdx },
    {
      $set: {
        members: roomToGo.members,
        roomMemberCnt: roomToGo.members.length,
      },
    }
  )
    .then(async () => {
      // 초대받은 사람의 roomIdx 정보 업데이트.
      await updateOne(
        { id: userInfo.id },
        {
          $set: {
            roomIdx: roomToGo.roomIdx,
          },
        }
      )
        .then(() => {
          console.log(`| 초대 받은 친구 및 방 정보 업데이트 완료 |`);
          res.json({
            isSuccess: true,
          });
        })
        .catch((err) => {
          console.log(
            `| 초대 받은 친구 및 방 정보 업데이트 중 에러 발생 | ${err}`
          );
          res.json({
            isSuccess: false,
          });
        });
    })
    .catch((err) => {
      console.log(`| 초대 받은 친구 및 방 정보 업데이트 중 에러 발생 | ${err}`);
      res.json({
        isSuccess: false,
      });
    });
};

const sendPushAlarm = async function (req, res, next) {
  let friendsReq = req.body.friends;
  if (typeof friendsReq == typeof "typeString") {
    // 친구 한명만 요청될 경우 string으로 값이 들어옴. -> 숫자형 배열로 수정.
    friendsReq = [parseInt(req.body.friends)];
  }

  const host = await User.findOne({ id: req.body.id }).exec();
  if (host) {
    for (let i = 0; i < friendsReq.length; i++) {
      preFriend = parseInt(friendsReq[i]);
      const preUser = await User.findOne({ id: preFriend });
      pushAlarm(
        preUser.my_device_id,
        `Picat 초대 알림`,
        `${host.nickname}님이 초대하였습니다.`,
        host
      );
    }

    res.json({
      isSuccess: true,
    });
  } else {
    res.json({
      isSuccess: false,
    });
  }
};

module.exports = { inviteFriends, sendPushAlarm };
