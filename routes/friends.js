const User = require("../models/User");
const Room = require("../models/Room");

let inviteFriends = async function (req, res, next) {
  let isSuccess = true;
  const friends = req.body.friends;
  console.log(req.body);

  const host = await User.findOne({ id: req.body.id }).exec();
  const hostRoom = await Room.findOne({ roomIdx: host.roomIdx });
  const newMembers = hostRoom.members;
  let memberCnt = hostRoom.roomMemberCnt;
  for (let i = 0; i < friends.length; i++) {
    let friend = await User.findOne({ id: friends[i] }).exec();
    if (friend) {
      await User.updateOne(
        { id: friends[i] },
        {
          $set: {
            roomIdx: hostRoom.roomIdx,
          },
        }
      ).then(() => {
        console.log(`${friends[i]} 유저 업데이트 완료`);
        if (!newMembers.includes(friend.id)) {
          newMembers.push(friend.id);
          memberCnt++;
        } else
          console.log(
            `${friend.nickname} - 초대하려는 친구가 이미 방에 있습니다.`
          );
      });

      // 친구가 원래 있던 방 정리
      const friendRoom = await Room.findOne({ roomIdx: friend.id });
      if (friendRoom) {
        friendRoomMembers = friendRoom.members;
        const idx = friendRoomMembers.indexOf(friend.id);
        if (idx > -1) friendRoomMembers.splice(idx, 1);
        await Room.updateOne(
          { roomIdx: friend.id },
          {
            $set: {
              roomMemberCnt: friendRoomMembers.length,
              members: friendRoomMembers,
            },
          }
        );
        console.log(
          `${friend.nickname}님 - ${hostRoom.roomIdx} 공유방으로 이동 완료`
        );
      }
    } else {
      console.log(`사용자[${friends[i]}]를 찾을 수 없습니다.`);
    }
  }
  // 호스트 방 업데이트
  await Room.updateOne(
    { roomIdx: host.roomIdx },
    {
      $set: {
        members: newMembers,
        roomMemberCnt: memberCnt,
      },
    }
  );

  res.json({
    isSuccess: isSuccess,
  });
};

module.exports = { inviteFriends };
