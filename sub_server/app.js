require('dotenv').config();
const http = require("http")
const express = require("express")
const mongoose = require("mongoose")
const spawn = require('child_process').spawn;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const Img = require("./models/Image")

const app = express()
const server = http.createServer(app)
const port = 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

async function checkBlur(url) {
  try {
    const { stdout, stderr } = await exec(`python3 ./laplacian_var.py ${url}`);
    if (parseInt(stdout.toString()) > 1000) {
      console.log(`| clear image  | ${parseInt(stdout.toString())} | ${url} |`)
    } else {
      console.log(`| blurry image | ${parseInt(stdout.toString())} | ${url} |`)
      await Img.updateOne({
        url: url
      }, {
        $set: {
          isBlur: true
        }
      })
    }
  } catch (err) {
    console.error(err);
  }
}

app.post("/checkBlur", async (req, res) => {
  console.log(`============================================`)
  const imageURL = req.body.imageURL;
  // const roomIdx = req.body.roomIdx;
  for (let i = 0; i < imageURL.length; i++) {
    let now = new Date()
    console.log(`| ${i + 1}/${imageURL.length} | size-${imageURL[i].size} | ${now} |`)
    // console.log(`| ${i + 1}/${imageURL.length} | ${now} |`)
    await checkBlur(imageURL[i].location);
  }
})


mongoose.set("strictQuery", true)
mongoose.connect(process.env.MONGODB_URL, {
  dbName: "picat"
}).then(() => {
  console.log("MongoDB 연결 성공")

  server.listen(port, (err) => {
    console.log(`서버가 실행됩니다... ${port}`)
  })
})
  .catch((err) => {
    console.error(`MongoDB 연결 에러 ${err}`)
  })
