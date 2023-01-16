const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  roomIdx: Number,
  roomMemberCnt: Number,
  members: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("Room", roomSchema);
