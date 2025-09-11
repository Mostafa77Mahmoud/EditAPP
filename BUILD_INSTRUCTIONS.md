
# Production Build Instructions

## Prerequisites

1. Make sure you have EAS CLI installed:
```bash
npm install -g @expo/eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

3. Initialize EAS in your project (if not done already):
```bash
eas build:configure
```

## Build Steps for Android Production APK

### 1. Clean and Install Dependencies
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Expo cache
npx expo install --fix
```

### 2. Update Your App Configuration
Ensure your `app.config.js` has the correct:
- `android.package` (unique identifier)
- `android.versionCode` (increment for each build)
- `version` (semantic version)

### 3. Build Production APK
```bash
# Build for Android production
eas build --platform android --profile production

# Alternative: Build both platforms
eas build --profile production
```

### 4. Monitor Build Progress
- The build will run on EAS servers
- You'll get a link to monitor progress
- Build typically takes 10-20 minutes
- You'll receive an email when complete

### 5. Download and Test APK
1. Download the APK from the EAS dashboard or email link
2. Install on Android device: `adb install path/to/your-app.apk`
3. Test all features thoroughly

## Key Features to Test on Device

### ✅ Core Functionality
- [ ] App opens without white screen
- [ ] Onboarding flows work correctly
- [ ] Language switching (EN/AR) works
- [ ] RTL layout displays properly
- [ ] Dark mode toggle persists

### ✅ Camera & PDF Generation
- [ ] Camera permission granted
- [ ] Single page capture works
- [ ] Multi-page capture works
- [ ] PDF generation from images successful
- [ ] PDF sharing/saving works
- [ ] Generated files accessible

### ✅ Storage & Persistence
- [ ] App settings persist after restart
- [ ] User data saves correctly
- [ ] No storage-related crashes
- [ ] Offline functionality works

### ✅ Backend Integration
- [ ] API calls work (if backend available)
- [ ] Graceful handling when backend offline
- [ ] Upload functionality works
- [ ] Data synchronization works

## Troubleshooting Common Issues

### White Screen on Startup
- Check error logs: `adb logcat | grep ReactNativeJS`
- Ensure all async operations in contexts are handled
- Verify no syntax errors in production bundle

### Camera Not Working
- Check permissions in `app.config.js`
- Verify expo-camera plugin is properly configured
- Test camera access in device settings

### PDF Generation Fails
- Check expo-print plugin configuration
- Verify file system permissions
- Test with simpler HTML content first

### Storage Issues
- Check if SecureStore is available
- Verify fallback to localStorage works on web
- Test data persistence after app restart

## Build Optimization

### Reduce Bundle Size
```bash
# Analyze bundle
npx expo bundle-size

# Remove unused dependencies
npm prune
```

### Performance Optimization
- Enable Hermes engine (configured in `app.config.js`)
- Optimize images and assets
- Minimize JavaScript bundle

## Release Checklist

- [ ] All features tested on physical device
- [ ] No console errors or warnings
- [ ] App icon and splash screen correct
- [ ] Permissions properly requested
- [ ] Offline functionality works
- [ ] Performance is acceptable
- [ ] Memory usage is reasonable
- [ ] Battery usage is optimized

## Support and Debugging

If you encounter issues:

1. Check EAS build logs for compilation errors
2. Test on Expo Go first to isolate build-specific issues
3. Use `eas build --profile preview` for faster testing builds
4. Enable development builds for debugging: `eas build --profile development`

Remember: Production builds are optimized and may behave differently than development builds. Always test thoroughly on actual devices before release.
