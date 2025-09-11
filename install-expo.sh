
#!/bin/bash

echo "🚀 Setting up Expo for Shariaa Analyzer..."

# Install Expo CLI globally
npm install -g expo-cli @expo/cli

# Install Expo dependencies
npm install expo@~50.0.0 \
  expo-router@~3.4.0 \
  expo-camera@~14.1.0 \
  expo-image-picker@~14.7.0 \
  expo-document-picker@~11.10.0 \
  expo-file-system@~16.0.0 \
  expo-constants@~15.4.0 \
  expo-status-bar@~1.11.0 \
  react-native-safe-area-context@4.8.2 \
  react-native-screens@~3.29.0 \
  react-native-gesture-handler@~2.14.0 \
  react-native-reanimated@~3.6.0 \
  @react-native-async-storage/async-storage@1.21.0 \
  react-native-svg@14.1.0 \
  nativewind@^2.0.11

# Install dev dependencies
npm install --save-dev babel-preset-expo@~10.0.0

echo "✅ Expo setup complete!"
echo ""
echo "📱 To run your app:"
echo "1. Web: npm run expo:web"
echo "2. iOS Simulator: npm run expo:ios" 
echo "3. Android Emulator: npm run expo:android"
echo "4. Expo Go: npm run expo:start (scan QR code)"
echo ""
echo "📥 Download Expo Go app on your phone to test instantly!"
