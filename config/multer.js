require("dotenv").config();
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const User = require("../models/User");
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: "picat-3rd",
    acl: "public-read",
    key: async function (req, file, cb) {
      const kid = req.headers.kid;
      const user = await User.findOne({ id: parseInt(kid) }).exec();
      const roomIdx = user.roomIdx;
      cb(
        null,
        roomIdx.toString() +
          "/" +
          Math.floor(Math.random() * 1000).toString() +
          Date.now() +
          "." +
          file.originalname.split(".").pop()
      );
    },
  }),
  limits: {
    fileSize: { fileSize: 1024 * 1024 * 10 },
  },
});

module.exports = upload;
