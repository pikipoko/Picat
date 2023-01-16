const User = require("../models/User");
const Img = require("../models/Image");
const Room = require("../models/Room");

/**기존 방 나가기 */
async function checkOutTheRoom(input_id) {
  const id = parseInt(input_id);
  console.log(`${id}, ${typeof id}`);
  const user = await User.findOne({ id: id }).exec();
  const originalRoom = await Room.findOne({ roomIdx: user.roomIdx });
  let updateMembers = originalRoom.members;

  // 기존 방 정보 업데이트
  const idx = updateMembers.indexOf(id);
  if (idx > -1) updateMembers.splice(idx, 1);
  await Room.updateOne(
    {
      roomIdx: user.roomIdx,
    },
    {
      $set: {
        roomMemberCnt: updateMembers.length,
        members: updateMembers,
      },
    }
  )
    .then(() => {
      console.log(`${user.nickname}님 - 기존 방 checkout 완료`);
    })
    .catch((err) => {
      console.log(`기존 방 나가는 도중 에러 발생 : ${err}`);
    });

  // 유저 정보 업데이트는 안함. checkInTheRoom에서 수행.

  // 방을 나갈 때 멤버 cnt가 0이면, 방에 있는 이미지들 모두 삭제. 일단 DB에서
  // S3 삭제하는 방법도 알아내야됨.
  if (updateMembers.length == 0) {
    console.log(`방에 남아있는 사람이 없기 때문에 이미지 삭제 시작`);
    await Img.deleteMany({ roomIdx: originalRoom.roomIdx }).then(() => {
      console.log(`방에 남아있던 이미지 모두 삭제 완료`);
    });
  }
}

/**새로운 방 찾기 */
async function checkInTheRoom(id) {
  const user = await User.findOne({ id: id }).exec();
  const emptyRoom = await Room.findOne({ roomMemberCnt: 0 }).exec();
  const updateMembers = [user.id];
  if (emptyRoom) {
    // 빈 방이 있는 경우

    // 방 업데이트
    await Room.updateOne(
      { roomIdx: emptyRoom.roomIdx },
      {
        $set: {
          roomMemberCnt: updateMembers.length,
          members: updateMembers,
        },
      }
    ).then(() => {
      console.log(`빈 방 DB 업데이트 완료`);
    });

    // 유저 정보 업데이트
    await User.updateOne(
      {
        id: id,
      },
      {
        $set: {
          roomIdx: emptyRoom.roomIdx,
        },
      }
    ).then(() => {
      console.log(`${user.nickname}님 ${emptyRoom.roomIdx}번 방으로 이동 완료`);
    });
  } else {
    // 빈 방이 없는 경우 -> 새 방 생성
    let newRoomIdx = await Room.count();
    let roomInUse = await Room.findOne({ roomIdx: newRoomIdx }).exec();
    while (roomInUse) {
      newRoomIdx++;
      roomInUse = await Room.findOne({ roomIdx: newRoomIdx }).exec();
    }
    const newRoom = new Room();
    newRoom.roomIdx = newRoomIdx;
    newRoom.roomMemberCnt = updateMembers.length;
    newRoom.members = updateMembers;
    await newRoom.save().then(() => {
      console.log(`| ${user.nickname} | 빈 방X -> 새 방[${newRoomIdx}] 할당`);
    });

    await User.updateOne(
      {
        id: id,
      },
      {
        $set: {
          roomIdx: newRoomIdx,
        },
      }
    ).then(() => {
      console.log(`${user.nickname}님 ${newRoomIdx}번 방으로 이동 완료`);
    });
  }
}

module.exports = { checkOutTheRoom, checkInTheRoom };
