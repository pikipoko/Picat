const User = require("../models/User");
const { makeDescription } = require("../config/face_api");

let login = async function (req, res, next) {
  const userInfo = req.body;

  const findUser = await User.findOne({ id: req.body.id }).exec();
  let descriptions = null;

  // 프로필 사진이 바뀌지 않은 경우, descriptions 수정 필요X
  if (findUser) {
    descriptions = findUser.descriptions;
    if (findUser.picture !== userInfo.picture)
      descriptions = await makeDescription(userInfo.picture);
  }

  const elements = [];
  for (let i = 0; i < userInfo.total_count; i++) {
    elements.push({
      id: userInfo.elements[i].id,
      uuid: userInfo.elements[i].uuid,
      favorite: userInfo.elements[i].favorite,
      profile_nickname: userInfo.elements[i].profile_nickname,
      profile_thumbnail: userInfo.elements[i].profile_thumbnail,
    });
  }
  if (findUser) {
    await User.updateOne(
      { id: req.body.id },
      {
        $set: {
          nickname: userInfo.nickname,
          picture: userInfo.picture,
          total_count: userInfo.total_count,
          email: userInfo.email,
          descriptions: descriptions,
          elements: elements,
        },
      }
    );

    res.json({
      message: "유저 정보 DB 업데이트 완료",
      isSuccess: true,
    });
  } else {
    const newUser = new User();
    descriptions = await makeDescription(userInfo.picture);

    newUser.id = userInfo.id;
    newUser.roomIdx = userInfo.id;
    newUser.nickname = userInfo.nickname;
    newUser.picture = userInfo.picture;
    newUser.email = userInfo.email;
    newUser.total_count = userInfo.total_count;
    newUser.descriptions = descriptions;
    newUser.elements = elements;
    console.log(newUser);
    newUser
      .save()
      .then((user) => {
        res.json({
          message: "유저 정보 DB 저장 성공",
          isSuccess: true,
        });
      })
      .catch((err) => {
        res.json({
          message: "유저 정보 DB 저장 실패",
          isSuccess: false,
        });
      });
  }
  console.log("/app/users/kakao finished");
};

module.exports = { login };
