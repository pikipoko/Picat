## SW 사관학교 정글 나만의 무기 프로젝트

얼굴 인식으로 쉽고 빠른 사진 공유 안드로이드 앱 Picat

2022.12.22 ~ 2023.01.28 (5주)

![Group 237](https://user-images.githubusercontent.com/69448918/215417167-6d308102-4bf7-4fda-84c1-fcedddd0e129.png)

## 맡은 역할 - 백엔드

#### Javascript, Python

#### Node.js + Express, AWS Rekognition, S3, EC2, MongoDB Atlas, OpenCV

- 서버 구축 및 배포

  - AWS EC2 Ubuntu 서버에 Node.js와 Express를 이용하여 서버 구축
  - RESTful API 명세서를 통해 프론트 엔드와 협업

- SaaS를 통한 메인 서버 부하 절감

  - AWS Rekognition를 이용한 얼굴 탐지 및 비교 기능
  - AWS S3 이용한 이미지 저장
  - MongoDB Atlas 서비스를 이용한 데이터베이스 구축

- 흐린 사진 판별 서버 (Node.js + Express)

  - OpenCV의 Laplacian 연산자를 이용하여 흐린 사진 판별 기능 구현

- 푸시 알람 기능

  - FCM 서비스 이용

- 여러 얼굴인식 라이브러리 적용 및 테스트를 통한 얼굴 분류 작업 속도 개선

  - 사진 1장당 5초 → 2초

- 서버 분리 및 흐린 사진 판별 작업 분리를 통해 클라이언트 응답에 걸리는 시간 개선
  - 사진 20장당 30초 → 20초

## 발표 영상

https://youtu.be/M4QCKSfNTdQ

## 기능 구현 과정

![얼굴인식_라이브러리_선택과정](https://user-images.githubusercontent.com/59064298/215989060-862d4907-f526-4726-abd6-d760981a2d3f.PNG)
![얼굴_분류_결과_처리_이슈_해결과정](https://user-images.githubusercontent.com/59064298/215989145-a2378339-7fbd-46bb-8993-2baa5ed19f2b.png)
![얼굴인식 결과 처리 로직](https://user-images.githubusercontent.com/59064298/215989193-2c6c51af-18fc-405f-836e-b65ded349540.PNG)
![흐린사진판별작업중이슈해결](https://user-images.githubusercontent.com/59064298/215989308-3524b2c4-4766-469c-b782-5a65709e68e4.PNG)

![DB](https://user-images.githubusercontent.com/59064298/215989336-c027f28f-8677-4710-92a8-38886e774294.PNG)

## 서비스 구조도

<img src = "https://user-images.githubusercontent.com/69448918/215393393-35f6f2c4-46c6-4a1c-9cb7-33732c45c531.png" width = "600px">

## 포스터

<img src = "https://user-images.githubusercontent.com/69448918/215391227-97fd1220-f07f-4861-beff-656e605f8699.png">
