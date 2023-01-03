require("dotenv").config();
const multer = require('multer');
const multerS3 = require('multer-s3');
// const aws = require('aws-sdk');
// const aws = require('@aws-sdk/client-s3');
const { S3Client } = require('@aws-sdk/client-s3');
// aws.config.loadFromPath(__dirname + '/awsconfig.json');
// const s3 = new aws.S3();
const s3=new S3Client({
    credentials:{
        accessKeyId:process.env.S3_ACCESS_KEY_ID,
        // accessKeyId:"AKIAQ3BFWEUQWQWV5HW2",
        secretAccessKey:process.env.S3_SECRET_ACCESS_KEY
        // secretAccessKey:"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"
    },
    region:'ap-northeast-2'
})

const upload = multer({
    storage: multerS3({
        s3,
        bucket: 'picat',
        // acl: 'public-read',
        key: function(req, file, cb) {
            cb(null, Math.floor(Math.random() * 1000).toString() + Date.now() + '.' + file.originalname.split('.').pop());
        }
    }),
    limits: {
        fileSize: {fileSize : 1024 * 1024 * 10},
    }
});

module.exports = upload;