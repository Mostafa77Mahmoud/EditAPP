export default {
  expo: {
    name: "Shar'AI",
    slug: "shariaa-analyzer",
    version: "2.0.1",
    sdkVersion: "53.0.0", // مهم جداً
    owner: "mostafa_mahmoud77",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mostafa.shariaaanalyzer",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.mostafa.shariaaanalyzer",
      versionCode: 3,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      // ملاحظات: لا تضع compileSdkVersion هنا — استخدم expo-build-properties أدناه
    },
    web: {
      favicon: "./assets/icon.png",
      bundler: "metro",
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: [
      [
        "expo-asset"
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow $(PRODUCT_NAME) to access your camera to scan documents.",
        },
      ],
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production",
        },
      ],
      "expo-font",
      "expo-secure-store",

      // ===========================
      // ضيف هذا السطر الأخير لتعيين compile/target/buildTools
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0"
          }
        }
      ]
      // ===========================
    ],
    extra: {
      apiBaseUrl: "https://tops-flea-heavily.ngrok-free.app",
      router: {
        origin: false,
      },
      eas: {
        projectId: "164c8d77-90bf-44d9-a544-8d52ce101435",
      },
    },
    scheme: "shariaa-analyzer",
  },
};
const IS_DEV = process.env.APP_VARIANT === 'development';
