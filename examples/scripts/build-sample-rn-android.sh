#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT_DIR/examples/sample-rn-app"
ANDROID_DIR="$APP_DIR/android"

echo "[info] Sample RN App: $APP_DIR"

if [[ ! -d "$APP_DIR" ]]; then
  echo "[error] Not found: $APP_DIR"; exit 1
fi

pushd "$APP_DIR" >/dev/null
if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "[info] Running expo prebuild for Android..."
  npx --yes expo prebuild -p android
fi

echo "[info] Building debug APK via Gradle..."
cd android
./gradlew assembleDebug -x lint -x test
popd >/dev/null

APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "[ok] APK built: $APK_PATH"
  echo "Export for connectivity: export MOBILE_APP_PATH=\"$APK_PATH\""
else
  echo "[error] APK not found at expected path: $APK_PATH"; exit 2
fi

