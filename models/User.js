const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// const {Schema} = mongoose;//object destructing을 이용한 같은코드

const userSchema = new Schema({
    email:{
        type:String,
        required:true//필수사항
    },
    name:String,
    age:{
        type:Number,
        min:18,
        max:50
    },
    // enrolled:{//현재 시간을 default에 저장
    //     type : Date,
    //     default :Date.now 
    // }
},{//새로운 object 전달
    timestamps: true//데이터 생성시간 기록, 마지막 업데이트 시간도 기록
})

module.exports=mongoose.model('User',userSchema);