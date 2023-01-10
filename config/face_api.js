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

let getDescriptorsFromDB = async function (image, id) {
  const user = await User.findOne({ id: id });
  let faces = [];
  if (!user) return null;

  for (let i = 0; i < user.elements.length; i++) {
    let friend = await User.findOne({ id: user.elements[i].id });
    if (friend) {
      for (let j = 0; j < friend.descriptions.length; j++) {
        friend.descriptions[j] = new Float32Array(
          Object.values(friend.descriptions[j])
        );
      }
      faces[i] = new faceapi.LabeledFaceDescriptors(
        `${friend.id}`,
        friend.descriptions
      );
    }
  }
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
  const results = resizedDetections.map((d) =>
    faceMatcher.findBestMatch(d.descriptor)
  );

  let rtnIds = [];
  for (let i = 0; i < results.length; i++)
    rtnIds[i] = parseInt(results[i]._label);
  return rtnIds;
};

module.exports = { loadModels, makeDescription, getDescriptorsFromDB };
