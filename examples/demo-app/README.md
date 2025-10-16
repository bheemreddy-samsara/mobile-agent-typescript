# Mobile Agent Demo App

A simple two-screen React Native application for demonstrating and testing the Mobile Agent SDK with three-tier vision fallback.

## Features

- **LoginScreen**: Email/password input fields, login button, forgot password link
- **HomeScreen**: Welcome message, item list, settings button, logout functionality
- **Cross-platform**: Runs on both iOS and Android

## Prerequisites

1. Node.js 18+ and npm
2. React Native development environment
3. For iOS: Xcode 14+ and CocoaPods
4. For Android: Android Studio and SDK
5. Appium Server (for testing)

## Setup

### 1. Install Dependencies

```bash
cd examples/demo-app
npm install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Make sure you have Android Studio installed and an emulator set up, or a physical device connected.

## Running the App

### iOS

```bash
npm run ios
# or for specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

### Android

```bash
npm run android
```

## Testing with Mobile Agent

### 1. Start Appium Server

```bash
appium --port 4723
```

### 2. Build and Install the App

For Android:
```bash
# Build APK
cd android
./gradlew assembleDebug
cd ..

# The APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

For iOS:
```bash
# Build for simulator
npx react-native run-ios --configuration Debug

# The .app will be in: ios/build/Build/Products/Debug-iphonesimulator/DemoApp.app
```

### 3. Run Tests

From the root project directory:

```bash
# Run demo app tests
cd ../..
npm test -- examples/tests/demo-app/
```

## App Structure

```
demo-app/
├── App.tsx                 # Main app with navigation
├── screens/
│   ├── LoginScreen.tsx     # Login screen component
│   └── HomeScreen.tsx      # Home screen component
├── android/                # Android native files
├── ios/                    # iOS native files
└── package.json           # Dependencies
```

## Credentials for Testing

The demo app accepts any credentials for testing purposes:

- **Email**: Any valid email format
- **Password**: Any non-empty string

## Appium Capabilities

### Android

```javascript
{
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': '/path/to/app-debug.apk',
  'appium:appPackage': 'com.demoapp',
  'appium:appActivity': '.MainActivity',
}
```

### iOS

```javascript
{
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': 'iPhone 15 Pro',
  'appium:platformVersion': '17.0',
  'appium:app': '/path/to/DemoApp.app',
  'appium:bundleId': 'com.demoapp',
}
```

## Troubleshooting

### Metro Bundler Issues

```bash
npm start -- --reset-cache
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
```

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
```

## Contributing

This demo app is part of the Mobile Agent SDK test suite. Feel free to extend it with additional screens or functionality to test more complex scenarios.

