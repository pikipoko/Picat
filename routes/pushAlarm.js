require("dotenv").config();
const request = require("request");
const { initializeApp } = require("firebase/app");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
  appId: process.env.FIREBASE_APPID,
  measurementId: process.env.FIREBASE_MEASUREMENTID,
};

const app = initializeApp(firebaseConfig);

function pushAlarm(deviceId, jsonTitle, jsonBody) {
  const options = {
    uri: "https://fcm.googleapis.com/fcm/send",
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: process.env.FIREBASE_APIKEY,
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
