const User = require("../models/User");
const Img = require("../models/Image");
const { getDescriptorsFromDB } = require("../config/face_api");

let uploadImage = async function (req, res, next) {
  try {
    const data = req.files;
    let images = [];
    let imgCnt = 0;
    let checkResult = [];
    const id = parseInt(req.body.id);
    console.log(`id[${id}] - 업로드할 이미지 개수 ${data.length}`);
    const user = await User.findOne({ id: id }).exec();
    const roomIdx = user.roomIdx;

    for (let i = 0; i < data.length; i++) {
      /* mongo DB에 id, url 저장하는 코드 추가 필요 */
      const newImg = new Img();

      newImg.roomIdx = roomIdx;
      newImg.id = id;
      newImg.url = data[i].location;

      images[imgCnt] = data[i].location;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then(async () => {
          // const DescriptorsFromDB = await getDescriptorsFromDB(
          //   data[imgCnt].location,
          //   user
          // );
          // if (DescriptorsFromDB) checkResult.push(DescriptorsFromDB);
          console.log(`[${imgCnt}] DB저장 완료`);
          imgCnt++;
        })
        .catch((err) => {
          // res.json({
          //   message: "이미지 생성정보 db저장실패",
          // });
          console.log(`[${imgCnt}] DB저장 실패${checkResult}`);
          console.error(err);
        });
    }

    console.log(`[${imgCnt}] DB저장 - 찾은 친구 [${checkResult}]`);
    res.json({
      url: images,
      img_cnt: imgCnt,
      friends: checkResult,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = { uploadImage };
