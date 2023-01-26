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
      console.log(`| ${user.id}님 | 기존 방 checkout 완료 |`);
    })
    .catch((err) => {
      console.log(`기존 방 나가는 도중 에러 발생 : ${err}`);
    });

  // 유저 정보 업데이트는 안함. checkInNewRoom에서 수행.

  // 방을 나갈 때 멤버 cnt가 0이면, 방에 있는 이미지들 모두 삭제.
  if (updateMembers.length == 0) {
    await Img.deleteMany({ roomIdx: originalRoom.roomIdx }).then(() => {
      console.log(`[${originalRoom.roomIdx}]번 방 이미지 삭제 완료`);
    });
  }
}

/**비었거나 새로운 방 찾기 */
async function checkInNewRoom(id) {
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
    ).then(async () => {
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
        console.log(`${user.id}님 ${emptyRoom.roomIdx}번 방으로 이동 완료`);
      });
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

    await newRoom.save().then(async () => {
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
        console.log(`${user.id}님 ${newRoomIdx}번 방으로 이동 완료`);
      });
    });

  }
}

/**유저를 해당 방으로 이동 */
async function checkInTheRoom(id, roomIdx) {
  const user = await User.findOne({ id: id }).exec()
  const room = await Room.findOne({ roomIdx: roomIdx }).exec()

  // 현재 방을 나가고
  await checkOutTheRoom(id);


}

module.exports = { checkOutTheRoom, checkInNewRoom };
