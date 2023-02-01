const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const {Schema} = mongoose;//object destructing을 이용한 같은코드

const imgSchema = new Schema({
  roomIdx: Number,
  id: Number,
  url: String,
  isBlur: Boolean,
  users: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("Image", imgSchema);
