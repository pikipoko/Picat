const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// const {Schema} = mongoose;//object destructing을 이용한 같은코드

const imgSchema = new Schema({
    user_room : String,
    user_id:String,
    url:String,
})

module.exports=mongoose.model('Image',imgSchema);