require("dotenv").config();
const request = require("request");

function pushAlarm(deviceId, jsonTitle, jsonBody) {
  const options = {
    uri: "https://fcm.googleapis.com/fcm/send",
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: process.env.FIREBASE_KEY,
    },
    json: {
      to: deviceId,
      notification: {
        title: jsonTitle,
        body: jsonBody,
      },
    },
  };

  request.post(options, function (err, httpResponse, body) {
    if (err) {
      console.log(`push alarm err - ${err}`);
    } else {
      console.log(`httpResponse - ${httpResponse}`);
      console.log(`body - ${body}`);
    }
  });
}

module.exports = pushAlarm;
