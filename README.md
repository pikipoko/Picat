## SW 사관학교 정글 나만의 무기 프로젝트 Picat

얼굴 인식으로 쉽고 빠른 사진 공유 안드로이드 앱

2022.12.22 ~ 2023.01.28 (5주)

![Group 237](https://user-images.githubusercontent.com/69448918/215417167-6d308102-4bf7-4fda-84c1-fcedddd0e129.png)

## 백엔드

### Skills

#### Javascript, Python

#### Node.js + Express, AWS Rekognition, S3, EC2, MongoDB Atlas, OpenCV

### 구현

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

### 성능 개선

- 여러 얼굴인식 라이브러리 적용 및 테스트를 통한 얼굴 분류 작업 속도 개선

  - 사진 1장당 5초 → 2초

- 흐린 사진 판별 서버(서브 서버)를 통해 클라이언트 응답에 걸리는 시간 개선

  - 사진 20장당 30초 → 20초

## 발표 영상

https://youtu.be/M4QCKSfNTdQ

## 기능 구현 과정

<img src = "https://user-images.githubusercontent.com/59064298/215990999-f283ee1b-03f2-425d-a711-64d9d9cfd421.png" width="900px">

---

<img src = "https://user-images.githubusercontent.com/59064298/215989145-a2378339-7fbd-46bb-8993-2baa5ed19f2b.png" width="700px">

---

<img src = "https://user-images.githubusercontent.com/59064298/215989193-2c6c51af-18fc-405f-836e-b65ded349540.PNG" width="800px">

---

<img src = "https://user-images.githubusercontent.com/59064298/215991407-c2f28b55-567b-43b3-a5e2-d144036d45ae.png" width="600px">

---

<img src = "https://user-images.githubusercontent.com/59064298/215991463-16ad23b4-84e3-4256-9afd-6a6be44369c8.png" width="700px">

## 서비스 구조도

<img src = "https://user-images.githubusercontent.com/69448918/215393393-35f6f2c4-46c6-4a1c-9cb7-33732c45c531.png" width = "600px">

## 포스터

<img src = "https://user-images.githubusercontent.com/69448918/215391227-97fd1220-f07f-4861-beff-656e605f8699.png">
