const mongoose = require("mongoose");
const MONGODB_URL =
  "mongodb+srv://picat:tumblers@picat.tkv3fcx.mongodb.net/?retryWrites=true&w=majority";

// mongoose.conncet(MONGODB_URL,{newNewUrlParser:true},(err)=>{
// mongoose.connect(MONGODB_URL
// ).then(()=>console.log("MongoDB Connected.")).catch(err=>console.log(err));
mongoose.set("strictQuery", true);
mongoose.connect(
  MONGODB_URL,
  {
    dbName: "dev", // 접속할 데이터베이스
  },
  (error) => {
    if (error) {
      console.error("MongoDB 연결 에러", error);
    } else {
      console.log("MongoDB 연결 성공");
    }
  }
);
