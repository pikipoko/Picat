require("request");
var fs = require("fs");

const downloadURL = async (URL) => {
  const requestOptions = {
    method: "GET",
    uri: URL,
  };

  const fileName =
    Math.floor(Math.random() * 1000).toString() +
    Date.now() +
    "." +
    URL.split(".").pop();

  await request(requestOptions).pipe(fs.createWriteStream("../" + fileName));
};
// // 네이버에 있는 신문의 이미지를 다운로드
// // 헤더를 지정하지 않고 바로 사용해도 됨
// var requestOptions = {
//   method: "GET",
//   uri: "http://concrete.korea.ac.kr/about/images/p_47.jpg",
//   encoding: null,
// };

// // 파일명을 지정한다.
// request(requestOptions).pipe(fs.createWriteStream("sample.jpg"));

module.exports = downloadURL;
