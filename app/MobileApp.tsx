import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StatusBar,

  Alert,
  StyleSheet,
  Animated,
  Platform,
  BackHandler,
} from "react-native";
import { useTheme } from "./contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "./contexts/LanguageContext";
import { useAuth } from "./contexts/AuthContext";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from "./contexts/SessionContext";
import { AnalysisProgressCard } from './components/AnalysisProgressCard';
import ProcessingService from './services/ProcessingService';
import {
  validateAllTranslations,
  createI18nDevTools,
} from "./utils/i18nValidator";
import { getOrCreateDeviceId } from "./utils/storage";
import * as Notifications from "expo-notifications";
import { computeAnalyticsFromLocal } from "./utils/analytics";

// Import screens
import HomeScreen from "./screens/HomeScreen";
import UploadScreen from "./screens/UploadScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ResultsScreen from "./screens/ResultsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import CameraScreen from "./screens/CameraScreen";

// Import components
import MobileNavigation from "./components/MobileNavigation";
import { EnhancedHeader } from "./components/enhanced/EnhancedHeader";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MobileApp: React.FC = () => {
  const { theme } = useTheme();
  const { language, isRTL } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const { sessionId: currentSessionId } = useSession();
  const { isAnalyzingContract, analysisProgress } = useSession();

  // Track active analysis jobs globally
  const [hasActiveAnalysis, setHasActiveAnalysis] = React.useState(false);
  const [isGlobalNavigationLocked, setIsGlobalNavigationLocked] = React.useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home");

  useEffect(() => {
    const checkActiveJobs = () => {
      const processingService = ProcessingService.getInstance();
      const activeJobs = processingService.getActiveJobs();
      const hasActiveJobs = activeJobs.length > 0;

      setHasActiveAnalysis(hasActiveJobs || isAnalyzingContract);
      
      // Navigation should only be locked while actively analyzing
      // NOT during the completion/redirect phase
      const shouldLockNavigation = isAnalyzingContract && currentScreen === "upload";
      setIsGlobalNavigationLocked(shouldLockNavigation);

      console.log('🔒 Global navigation lock state:', {
        hasActiveJobs,
        isAnalyzing: isAnalyzingContract,
        activeJobsCount: activeJobs.length,
        currentScreen,
        shouldLock: shouldLockNavigation,
        navigationLocked: shouldLockNavigation
      });
    };

    // Check immediately
    checkActiveJobs();

    // Set up interval to check periodically
    const interval = setInterval(checkActiveJobs, 500);
    return () => clearInterval(interval);
  }, [isAnalyzingContract, currentScreen]);

  // Always start on Home screen
  useEffect(() => {
    setCurrentScreen("home");
  }, []);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [cameraGeneratedFile, setCameraGeneratedFile] = useState<any>(null);
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);
  const [analyticsComputed, setAnalyticsComputed] = useState(false);

  // Initialize notifications and services
  useEffect(() => {
    initializeNotifications();
    initializeServices();
    computeInitialAnalytics();
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log("🔔 Initializing notifications...");

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === "granted") {
        setNotificationPermissionGranted(true);
        console.log("🔔 Notification permissions granted");

        // Store permission status
        await AsyncStorage.setItem("notifications_permission", "granted");
      } else {
        setNotificationPermissionGranted(false);
        console.log("🔔 Notification permissions denied");

        await AsyncStorage.setItem("notifications_permission", "denied");
      }

      // Set up notification listeners
      const notificationListener =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log("🔔 Notification received:", notification);
        });

      const responseListener =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("🔔 Notification response:", response);

          // Handle notification tap
          const data = response.notification.request.content.data;
          if (data?.type === "analysis_complete" && data?.sessionId) {
            // Navigate to results screen
            setCurrentScreen("results");
          }
        });

      // Cleanup listeners on unmount
      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    } catch (error) {
      console.warn("🔔 Failed to initialize notifications:", error);
    }
  };

  const initializeServices = async () => {
    try {
      console.log("🚀 Initializing services...");
      const processingService = ProcessingService.getInstance();
      await processingService.initialize();
      console.log("✅ Services initialized");
    } catch (error) {
      console.error("❌ Failed to initialize services:", error);
    }
  };

  const computeInitialAnalytics = async () => {
    try {
      console.log("📊 Computing initial analytics...");
      const analytics = await computeAnalyticsFromLocal();
      console.log("📊 Analytics computed:", analytics);
      setAnalyticsComputed(true);
      // Here you would typically update your context/state with the analytics
      // For example: updateHomeScreenAnalytics(analytics);
    } catch (error) {
      console.error("❌ Failed to compute analytics:", error);
      setAnalyticsComputed(true); // Still mark as computed to not block UI
    }
  };

  // Show onboarding only on first app install
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      try {
        const hasSeenTutorial = await AsyncStorage.getItem("hasSeenTutorial");

        if (!hasSeenTutorial) {
          // First time opening the app - show onboarding
          console.log("📚 First time user - showing onboarding");
          setShowOnboarding(true);
        } else {
          // Returning user - skip onboarding
          console.log("📚 Returning user - skipping onboarding");
          setShowOnboarding(false);
        }
      } catch (error) {
        console.warn("⚠️ Failed to check onboarding status:", error);
        // Fallback: don't show onboarding if there's an error
        setShowOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [authLoading]);

  // Handle hardware back button navigation
  useEffect(() => {
    const handleBackPress = () => {
      console.log("🔙 Hardware back button pressed on screen:", currentScreen);

      // If showing onboarding, don't handle back press (let it exit)
      if (showOnboarding) {
        return false;
      }

      // Block back button if navigation is locked during analysis
      if (isGlobalNavigationLocked) {
        console.log('🔒 Hardware back button BLOCKED - Analysis in progress');
        return true; // Prevent navigation
      }

      // Handle navigation based on current screen
      switch (currentScreen) {
        case "home":
          // On home screen, allow app to exit
          console.log("🔙 On home screen - allowing app exit");
          return false;

        case "results":
        case "upload":
        case "camera":
        case "history":
        case "profile":
          // Navigate back to home
          console.log("🔙 Navigating back to home from:", currentScreen);
          handleNavigate("home");
          return true; // Prevent default behavior (app exit)

        default:
          // For any other screen, go to home
          console.log(
            "🔙 Unknown screen, navigating to home from:",
            currentScreen,
          );
          handleNavigate("home");
          return true;
      }
    };

    // Only set up back handler on Android
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );
      return () => backHandler.remove();
    }
  }, [currentScreen, showOnboarding, isGlobalNavigationLocked]);

  // Initialize device ID and development tools
  useEffect(() => {
    const initializeApp = async (): Promise<(() => void) | undefined> => {
      try {
        // Generate/retrieve device ID
        const deviceId = await getOrCreateDeviceId();
        console.log(
          "🔑 App initialized with device ID:",
          deviceId.substring(0, 8) + "...",
        );

        // Don't auto-navigate to results on app start
        // User should manually navigate to view their contract history
        console.log("🏠 App initialized - staying on home screen");

        // Initialize i18n validation in development
        if (__DEV__) {
          console.log("🌍 Initializing i18n validation...");
          validateAllTranslations();

          // Set up development tools
          const cleanupI18n = createI18nDevTools();

          // Cleanup on unmount
          return cleanupI18n;
        }

        return undefined;
      } catch (error) {
        console.error("❌ App initialization failed:", error);
        return undefined;
      }
    };

    let cleanupFunction: (() => void) | undefined;

    initializeApp().then((cleanup) => {
      cleanupFunction = cleanup;
    });

    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
      // Cleanup processing service
      try {
        const processingService = ProcessingService.getInstance();
        processingService.cleanup();
      } catch (error) {
        console.warn("⚠️ Failed to cleanup processing service:", error);
      }
    };
  }, []);

  // Check for stored camera document
  useEffect(() => {
    const checkStoredDocument = async () => {
      try {
        if (Platform.OS === "web") {
          const storedDoc = localStorage.getItem("temp_camera_document");
          if (storedDoc) {
            const document = JSON.parse(storedDoc);
            setCameraGeneratedFile(document);
            localStorage.removeItem("temp_camera_document");
          }
        } else {
          // Use AsyncStorage for React Native
          const AsyncStorage = await import(
            "@react-native-async-storage/async-storage"
          );
          const storedDoc = await AsyncStorage.default.getItem(
            "temp_camera_document",
          );
          if (storedDoc) {
            const document = JSON.parse(storedDoc);
            setCameraGeneratedFile(document);
            await AsyncStorage.default.removeItem("temp_camera_document");
          }
        }
      } catch (e) {
        console.warn("Could not retrieve stored document:", e);
      }
    };

    if (currentScreen === "upload") {
      checkStoredDocument();
    }
  }, [currentScreen]);

  const handleNavigate = useCallback((screen: ScreenType, sessionId?: string) => {
    try {
      console.log('📍 Navigation request:', screen, sessionId);

      // Special case: Allow navigation to results even if analysis is still flagged
      // This handles the completion redirect scenario
      const isCompletionRedirect = screen === "results" && sessionId;
      
      // Check if navigation is globally locked due to ongoing analysis
      if (isGlobalNavigationLocked && !isCompletionRedirect) {
        console.log('🔒 Navigation BLOCKED - Global navigation lock is active during analysis');
        console.log('🔒 Current state:', {
          isAnalyzing: isAnalyzingContract,
          hasActiveAnalysis,
          currentScreen,
          targetScreen: screen,
          globalLock: isGlobalNavigationLocked,
          isCompletionRedirect
        });
        return;
      }

      // If it's a completion redirect, log it specially
      if (isCompletionRedirect) {
        console.log('🎯 Allowing completion redirect to results:', sessionId);
      }

      // Don't navigate if we're already on the target screen
      if (currentScreen === screen) {
        console.log("📍 Already on target screen, ignoring navigation");
        return;
      }

      // Clear camera file when navigating away from upload
      if (currentScreen === "upload" && screen !== "upload") {
        setCameraGeneratedFile(null);
      }

      // Add fade animation for screen transitions
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // If navigating to results with sessionId, store it for the ResultsScreen
        if (screen === 'results' && sessionId) {
          // The sessionId will be handled by SessionContext when the screen loads
          console.log('📱 Navigating to results with session:', sessionId);
        }
        setCurrentScreen(screen);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to home screen
      setCurrentScreen('home');
    }
  }, [isGlobalNavigationLocked, currentScreen, isAnalyzingContract, hasActiveAnalysis, fadeAnim, currentSessionId]);


  const handleAnalysisComplete = (sessionId: string) => {
    // Clear camera file after successful analysis
    setCameraGeneratedFile(null);
    console.log(`🎯 Analysis complete - navigating to results for session: ${sessionId}`);
    handleNavigate("results", sessionId);
  };

  const handleCameraUpload = useCallback((file: any) => {
    console.log("📁 MobileApp: Received file from camera:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      hasImages: file?.hasImages,
    });

    // Store the file and navigate to upload
    setCameraGeneratedFile(file);
    setCurrentScreen("upload");
  }, []);

  const renderCurrentScreen = () => {
    try {
      if (showOnboarding) {
        return (
          <OnboardingScreen
            onComplete={async () => {
              try {
                await AsyncStorage.setItem("hasSeenTutorial", "true");
                console.log("✅ Onboarding completed, flag set");
              } catch (error) {
                console.warn("⚠️ Failed to save onboarding completion:", error);
              }
              setShowOnboarding(false);
            }}
          />
        );
      }

      switch (currentScreen) {
        case "home":
          return <HomeScreen onNavigate={handleNavigate} />;
        case "upload":
          return (
            <UploadScreen
              onAnalysisComplete={handleAnalysisComplete}
              onBack={() => handleNavigate("home")}
              preSelectedFile={cameraGeneratedFile}
              fromCamera={!!cameraGeneratedFile}
              autoUpload={!!cameraGeneratedFile}
            />
          );
        case "camera":
          return (
            <CameraScreen
              onNavigate={handleNavigate}
              onUpload={handleCameraUpload}
            />
          );
        case "history":
          return (
            <HistoryScreen
              onNavigate={handleNavigate}
              onBack={() => handleNavigate("home")}
            />
          );
        case "profile":
          return <ProfileScreen onBack={() => handleNavigate("home")} />;
        case "results":
          return currentSessionId ? (
            <ResultsScreen
              onBack={() => handleNavigate("home")}
              sessionId={currentSessionId}
            />
          ) : (
            <HomeScreen onNavigate={handleNavigate} />
          );
        default:
          return <HomeScreen onNavigate={handleNavigate} />;
      }
    } catch (error) {
      console.error('❌ Error rendering screen:', currentScreen, error);
      // Fallback to home screen
      return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  const backgroundColor = theme === "dark" ? "#111827" : "#f9fafb";
  const statusBarStyle = theme === "dark" ? "light-content" : "dark-content";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={false}
      />

      {!showOnboarding && (
        <EnhancedHeader title={currentScreen} onNavigate={handleNavigate} />
      )}

      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor,
            opacity: fadeAnim,
            // Improve RTL handling for web
            direction: isRTL ? "rtl" : "ltr",
            ...(Platform.OS === "web" &&
              isRTL && {
                transform: [{ scaleX: 1 }], // Remove the flip, use CSS direction instead
              }),
          },
        ]}
      >
        {renderCurrentScreen()}
      </Animated.View>

      {!showOnboarding && (
        <MobileNavigation
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          disabled={isGlobalNavigationLocked}
        />
      )}

      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default MobileApp;
export type ScreenType =
  | "home"
  | "upload"
  | "camera"
  | "history"
  | "profile"
  | "results";