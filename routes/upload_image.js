const User = require("../models/User");
const Img = require("../models/Image");
const { getDescriptorsFromDB } = require("../config/face_api");

let upload_image = async function (req, res, next) {
  try {
    let data = req.files;
    let images = [];
    let img_cnt = 0;
    let check_result = [];
    for (let i = 0; i < data.length; i++) {
      /* mongo DB에 id, url 저장하는 코드 추가 필요 */
      const newImg = new Img();
      let user = await User.findOne({ id: id }).exec();
      let roomIdx = user.roomIdx;
      newImg.roomIdx = roomIdx;
      newImg.id = req.body.id;
      newImg.url = data[img_cnt].location;
      images[img_cnt] = data[img_cnt].location;
      await newImg
        .save() //실제로 저장된 유저값 불러옴
        .then(async (user) => {
          const DescriptorsFromDB = await getDescriptorsFromDB(
            data[img_cnt].location,
            req.body.id
          );
          if (DescriptorsFromDB) check_result.push(DescriptorsFromDB);
          console.log(`[${img_cnt}] DB저장 ${check_result}`);
          img_cnt++;
        })
        .catch((err) => {
          res.json({
            message: "이미지 생성정보 db저장실패",
          });
          console.error(err);
        });
    }
    res.json({
      url: images,
      img_cnt: img_cnt,
      friends: check_result,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = { upload_image };
