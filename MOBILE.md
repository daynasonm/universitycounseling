# 입시플래너 모바일 앱 실행

이 프로젝트는 기존 Vite 웹사이트를 유지하면서 Capacitor로 iOS와 Android 앱을 만듭니다.

## 웹사이트

```bash
npm run dev
npm run build
```

웹사이트는 기존처럼 `http://127.0.0.1:5173/`에서 작동합니다.

## 모바일 공통

웹 빌드를 만든 뒤 네이티브 프로젝트에 동기화합니다.

```bash
npm run mobile:sync
```

## iOS

필요한 도구:

- Xcode

동기화:

```bash
npm run ios:sync
```

Xcode에서 열기:

```bash
npm run ios:open
```

iOS 프로젝트 위치:

```text
ios/App/App.xcodeproj
```

## Android

필요한 도구:

- Android Studio
- Java Runtime/JDK

동기화:

```bash
npm run android:sync
```

Android Studio에서 열기:

```bash
npm run android:open
```

Android 프로젝트 위치:

```text
android/
```

## 주의

현재 로그인과 학생 데이터는 프로토타입용으로 브라우저/앱 내부 `localStorage`에 저장됩니다. 실제 배포 앱에서는 서버 인증과 데이터베이스로 옮겨야 상담사-학생 데이터가 여러 기기에서 공유됩니다.
