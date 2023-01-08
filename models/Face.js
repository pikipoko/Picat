const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const {Schema} = mongoose;//object destructing을 이용한 같은코드

const faceSchema = new Schema({
  label: {
    type: String,
    required: true,
    unique: true,
  },
  descriptions: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("Face", faceSchema);
