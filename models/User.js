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
    elements: {
      type: Array,
      required: true,
    },
    my_device_id: String,
  },
  {
    timestamps: true, //데이터 생성시간 기록, 마지막 업데이트 시간도 기록
  }
);

module.exports = mongoose.model("User", userSchema);
