// face-api.js 관련 모듈 선언
const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
faceapi.env.monkeyPatch({ Canvas, Image });

const User = require("../models/User");

const useTinyModel = true;

// face-api 모델 로드
let loadModels = async function () {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/weights");
  await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(__dirname + "/weights");
  await faceapi.nets.tinyFaceDetector.loadFromDisk(__dirname + "/weights");
};

let makeDescription = async function (image) {
  try {
    const descriptions = [];

    const img = await canvas.loadImage(image);
    if (!img) {
      console.log("이미지 파일 분석 불가");
      return null;
    }

    const detections = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(useTinyModel)
      .withFaceDescriptor();

    // 얼굴 인식X -> 저장X
    if (detections) descriptions.push(detections.descriptor);

    return descriptions;
  } catch (error) {
    console.log(error);
    return [];
  }
};

//uploadImage 함수 내에서 이미지 DB에 저장 후 "url" 1개와 올린사람 "user" 전달
let getDescriptorsFromDB = async function (image, user) {
  console.log("==========getDescriptorsFromDB 함수=========");
  // const user = await User.findOne({ id: id });
  let faces = [];
  if (!user) {
    console.log(`invalid user - ${id}`);
    return null;
  }

  //사진 1개 당 친구 수 만큼 반복문 수행하며 친구 id를 조회하고, DB에서 그 id에 해당하는 친구 friend찾기
  for (let i = 0; i < user.elements.length; i++) {
    let friend = await User.findOne({ id: user.elements[i] });
    if (friend) {
      for (let j = 0; j < friend.descriptions.length; j++) {
        // Change the face data descriptors from Objects to Float32Array type
        friend.descriptions[j] = new Float32Array(
          Object.values(friend.descriptions[j])
        );
      }
      //친구목록에서 친구 id와 desc를 faces에 저장
      faces[i] = new faceapi.LabeledFaceDescriptors(
        `${friend.id}`, //label
        friend.descriptions
      );
    } else {
      console.log(`friend find 실패 - ${user.elements[i]}`);
    }
  }
  if (faces.length > 0) {
    // Load face matcher to find the matching face
    const faceMatcher = new faceapi.FaceMatcher(faces, 0.55);

    // Read the image using canvas or other method
    const img = await canvas.loadImage(image);
    let temp = faceapi.createCanvasFromMedia(img);

    // Process the image for the model
    const displaySize = { width: img.width, height: img.height };
    faceapi.matchDimensions(temp, displaySize);

    // Find matching faces
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(useTinyModel)
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    //results에는 faces중에서 유사한 얼굴이 있는 친구들의 id(label)와 distance 저장
    const results = resizedDetections.map((d) =>
      faceMatcher.findBestMatch(d.descriptor)
    );
    let rtnIds = [];
    for (let i = 0; i < results.length; i++)
      rtnIds[i] = parseInt(results[i]._label);
    console.log("==========getDescriptorsFromDB 함수=========");
    return rtnIds;
  }
  return [];
};

module.exports = { loadModels, makeDescription, getDescriptorsFromDB };
