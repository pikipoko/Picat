require("dotenv").config();
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const AWS = require("aws-sdk");

const User = require("../models/User");
const s3 = new S3Client({
  // const s3Bucket = new AWS.S3({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.PICAT,
    acl: "public-read",
    key: async function (req, file, cb) {
      const s3URI =
        Math.floor(Math.random() * 1000).toString() +
        Date.now() +
        "." +
        file.originalname.split(".").pop();
      cb(null, s3URI);
    },
  }),
  limits: {
    fileSize: { fileSize: 1024 * 1024 * 10 },
  },
});

module.exports = upload;
