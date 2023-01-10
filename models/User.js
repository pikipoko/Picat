const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const {Schema} = mongoose;//object destructing을 이용한 같은코드

const userSchema = new Schema(
  {
    id: Number,
    nickname: String,
    picture: String,
    email: String,
    roomIdx: Number,
    total_count: Number,
    descriptions: {
      type: Array,
      required: true,
    },
    elements: {
      type: Array,
      required: true,
    },
    // elements: [
    // new Schema({
    //   id: Number,
    //   uuid: String,
    //   favorite: Boolean,
    //   profile_nickname: String,
    //   profile_thumbnail_image: String,
    // }),
    // ],
  },
  {
    //새로운 object 전달
    timestamps: true, //데이터 생성시간 기록, 마지막 업데이트 시간도 기록
  }
);

module.exports = mongoose.model("User", userSchema);
