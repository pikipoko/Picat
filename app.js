/**모듈 선언 */
const http = require("http");
const express = require("express");
const upload = require("./config/multer");
const mongoose = require("mongoose");

/**Models */
const User = require("./models/User");
const Img = require("./models/Image");
const Room = require("./models/Room");

/**서버 설정 */
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const port = 5000;

/**routes */
const { login } = require("./routes/login");
const { inviteFriends, sendPushAlarm } = require("./routes/friends");
const { uploadImage } = require("./routes/uploadImage");
const { filter } = require("./routes/filter");

const { allowCrossDomain } = require("./config/allowCrossDomain");
const { checkOutTheRoom, checkInTheRoom } = require("./config/checkInOut");

/**공통 미들웨어 장착*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(allowCrossDomain);

/**라우터 */
app.post("/image", upload.array("image"), uploadImage); /**이미지 업로드 */
app.post("/app/users/kakao", login); /**카카오톡을 통한 로그인 */
app.get("/filter", filter); /**필터 요청 */
app.post("/friends", sendPushAlarm); /**초대 알람 푸시 알람 전송*/
app.post("/accept", inviteFriends); /**초대 수락 */

let socketCnt = 0;
/**소켓 통신 */
io.sockets.on("connection", (socket) => {
  socketCnt++;
  console.log(
    `Socket connected    | ${socket.id} | 현재 소켓 수 : ${socketCnt} |`
  );
  /**공유방 접속 */
  socket.on("join", async (joinData) => {
    if (joinData) {
      const friendList = joinData.elements.map((obj) => obj.id);
      const user = await User.findOne({ id: joinData.id }).exec();
      const roomIdx = user.roomIdx;

      /**방 접속 */
      socket.join(roomIdx);
      const imagesInRoom = await Img.find(
        { roomIdx: roomIdx },
        { _id: 0, url: 1 }
      ).exec();

      const emit_data = {
        img_list: imagesInRoom,
        img_cnt: imagesInRoom.length,
      };

      /**공유방 이미지 목록 클라이언트에게 전달 */
      io.to(socket.id).emit("join", emit_data);
      console.log(
        `| ${user.nickname} | friendList : [${friendList}] | joined - room:${roomIdx} | 기존 사진 전송 - ${emit_data.img_cnt}개 |`
      );

      /**join할 때 친구목록 업데이트 */
      await User.updateOne(
        { id: joinData.id },
        {
          $set: {
            elements: friendList,
          },
        }
      ).then(() => {
        console.log(`| ${user.nickname} | 친구목록 업데이트 완료 |`);
      });
    }
  });

  /**방 멤버들에게 자신의 정보 전달 */
  socket.on("participate", async (memberData) => {
    console.log(`\n| participate |`);
    if (memberData) {
      const room = await Room.findOne({
        members: { $in: [memberData.id] },
      }).exec();
      if (room) {
        let emitMembers = {};
        await User.find(
          { id: { $in: room.members } },
          { _id: 0, id: 1, nickname: 1, picture: 1 },
          function (err, docs) {
            emitMembers = {
              friends_list: docs,
            };
            io.to(room.roomIdx).emit("participate", emitMembers);
          }
        ).clone();
      }
    }
  });

  /**다른 유저들에게 사진 전송 */
  socket.on("image", async (data) => {
    const user = await User.findOne({ id: data.id }).exec();
    console.log(
      `| image | 보낸사람: ${user.nickname}, 업로드 수: ${data.img_cnt} |`
    );
    const roomIdx = user.roomIdx;
    io.to(roomIdx).emit("image", data);
  });

  /**방 나가기 */
  socket.on("exit", async (id) => {
    const user = await User.findOne({ id: id }).exec();
    const originalRoom = await Room.findOne({ roomIdx: user.roomIdx }).exec();

    await checkOutTheRoom(id);
    await checkInTheRoom(id);

    console.log(`| exit | ${user.nickname}님이 방을 나갔습니다.`);
    io.to(originalRoom.roomIdx).emit("exit", id);
  });

  socket.on("disconnect", () => {
    socketCnt--;
    console.log(
      `Socket disconnected | ${socket.id} | 현재 소켓 수 : ${socketCnt} |`
    );
  });
});

/**db 설정*/
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGODB_URL, {
    dbName: "picat", // 접속할 데이터베이스
  })
  .then(() => {
    console.log("MongoDB 연결 성공");

    /**생성된 서버가 포트를 리스닝 */
    server.listen(port, (err) => {
      console.log(`서버가 실행됩니다...${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB 연결 에러", err);
  });
