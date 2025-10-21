#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEMO_DIR="$ROOT_DIR/examples/demo-app"
ANDROID_DIR="$DEMO_DIR/android"
GRADLEW="$ANDROID_DIR/gradlew"

echo "[info] Demo app directory: $DEMO_DIR"

if [[ ! -d "$DEMO_DIR" ]]; then
  echo "[error] Demo app folder not found at $DEMO_DIR"
  echo "Create it (React Native) or provide an APK via MOBILE_APP_PATH."
  exit 1
fi

if [[ ! -x "$GRADLEW" ]]; then
  echo "[warn] Android project not found (missing $GRADLEW)."
  cat << 'EONOTE'
This repository includes only the demo app sources (TypeScript screens), not the full
Android native project. To build an APK locally, generate the Android project inside
examples/demo-app using React Native tooling, then rerun this script.

Quick steps (on your machine):
  cd examples/demo-app
  # Ensure React Native CLI pre-reqs are installed (Android SDK, Java, etc.)
  npx react-native@latest init DemoAppTemp --version 0.74.5 || true
  # Or copy an existing android/ folder into examples/demo-app/android

Once examples/demo-app/android exists with a working gradle wrapper, rerun:
  bash examples/scripts/build-demo-apk.sh

Alternatively, set MOBILE_APP_PATH to any existing APK and use:
  npx ts-node examples/connectivity-android.ts
EONOTE
  exit 2
fi

echo "[info] Building debug APK..."
pushd "$ANDROID_DIR" >/dev/null
./gradlew assembleDebug -x lint -x test
popd >/dev/null

APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "[ok] APK built: $APK_PATH"
  echo
  echo "Export this for the connectivity test:"
  echo "  export MOBILE_APP_PATH=\"$APK_PATH\""
  echo "Then run:"
  echo "  npx ts-node examples/connectivity-android.ts"
  exit 0
else
  echo "[error] APK not found at expected path: $APK_PATH"
  exit 3
fi

