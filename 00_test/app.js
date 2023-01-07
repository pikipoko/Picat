// 모듈 선언
var http = require('http');
var express = require('express');
var app = express();
var fs = require('fs');
var socketio = require('socket.io');

var multer = require('multer');
const upload = require('./config/multer');
var path = require('path');
// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/') // cb 콜백함수를 통해 전송된 파일 저장 디렉토리 설정
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname) // cb 콜백함수를 통해 전송된 파일 이름 설정
//   }
// })
// var upload = multer({ storage: storage })

// 웹서버 생성
var server = http.createServer(app);
app.get('/', (req, res) => {
  fs.readFile('HTMLPage.html', (error, data) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
})
server.listen(5000, () => {
  console.log('Server Running at http://127.0.0.1:5000');
});

//
// var io = socketio.listen(server);
const io=require('socket.io')(server);
io.sockets.on('connection', (socket) => {
  // message 
  var roomName = null;

  socket.on('join', (data) => { // data는 브라우저에서 보낸 방 아이디
    roomName = data;
    socket.join(data);// 네임스페이스 아래에 존재하는 방에 접속
  })

  socket.on('message', (data) => {
    io.sockets.in(roomName).emit('message', data);
    console.log(data);
  });

  socket.on('image', (data)=>{
    io.sockets.in(roomName).emit('image', data);
    console.log(data);
  })
  
});

app.post( '/image', upload.single("image"), function(req, res, next) {
  try {
    // var file = './uploads' + req.file.filename;
    console.log(req.file)
    var data = req.file;
    // res.send(data.location);
  } catch (error) {
    console.error(error);
    next(error);
  }
});