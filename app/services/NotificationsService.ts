import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useNavigation } from '@react-navigation/native'; // Assuming you use React Navigation

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Deprecated - using shouldShowBanner instead
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface LocalNotificationOptions {
  title: string;
  body: string;
  data?: any;
  seconds?: number;
  trigger?: any; // Use any to avoid type conflicts
}

class NotificationsService {
  private static instance: NotificationsService;
  private permissionGranted = false;
  private listeners: Array<() => void> = [];
  private appState = '';

  private constructor() {
    this.init();
  }

  static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService();
    }
    return NotificationsService.instance;
  }

  private async init() {
    try {
      // Check if permission was previously granted
      const storedPermission = await AsyncStorage.getItem('notifications_permission');
      if (storedPermission === 'granted') {
        this.permissionGranted = true;
      }

      // Set up notification response listeners
      this.setupListeners();

      // Handle app state changes for notifications
      this.handleAppStateChange();
    } catch (error) {
      console.warn('Failed to initialize notifications service:', error);
    }
  }

  private setupListeners() {
    // Handle notification received while app is foregrounded
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (when user taps on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap data
      if (response.notification.request.content.data) {
        this.handleNotificationTap(response.notification.request.content.data);
      }
    });

    // Store cleanup functions
    this.listeners.push(() => {
      receivedSubscription.remove();
      responseSubscription.remove();
    });
  }

  private handleNotificationTap(data: any) {
    // Handle different notification types based on data
    console.log('Handling notification tap with data:', data);

    // Example: Navigate to specific screen based on notification type
    // This would be connected to your app's navigation system
    if (data.type === 'contract_processed') {
      // Navigate to results screen
      // NavigationService.navigate('ResultsScreen', { sessionId: data.sessionId });
    } else if (data.type === 'order_status_change') {
      // Navigate to history or orders screen
      // NavigationService.navigate('HistoryScreen', { orderId: data.orderId });
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        this.permissionGranted = true;
        await AsyncStorage.setItem('notifications_permission', 'granted');
        console.log('Notification permissions granted');
        return true;
      } else {
        await AsyncStorage.setItem('notifications_permission', 'denied');
        console.log('Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleLocalNotification(options: LocalNotificationOptions): Promise<string | null> {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.warn('Cannot schedule notification: permission not granted');
          return null;
        }
      }

      const trigger = options.trigger || (options.seconds ? { seconds: options.seconds } : null);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
        },
        trigger,
      });

      console.log('Notification scheduled with identifier:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Notification cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Convenience methods for common notification types
  async scheduleContractProcessedNotification(
    contractName: string, 
    sessionId: string,
    translatedTitle?: string,
    translatedBody?: string
  ): Promise<void> {
    await this.scheduleLocalNotification({
      title: translatedTitle || 'Analysis Complete',
      body: translatedBody || 'Your contract is ready for review',
      data: { 
        type: 'contract_processed', 
        sessionId,
        fileName: contractName,
        timestamp: new Date().toISOString()
      },
      seconds: 1, // Show immediately
    });
  }

  async scheduleOrderStatusNotification(status: string, orderId: string): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'Order Status Update',
      body: `Your order status has changed to: ${status}`,
      data: { type: 'order_status_change', orderId },
      seconds: 1, // Show immediately
    });
  }

  async scheduleReminderNotification(message: string, delayMinutes: number): Promise<string | null> {
    return await this.scheduleLocalNotification({
      title: 'Shariaa Analyzer Reminder',
      body: message,
      data: { type: 'reminder' },
      seconds: delayMinutes * 60, // Convert to seconds
    });
  }

  // Clean up listeners when app is unmounted
  cleanup() {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }

  private handleAppStateChange() {
    const subscription = AppState.addEventListener('change', nextAppState => {
      this.appState = nextAppState;
      if (this.appState === 'active') {
        // Optionally, re-check permissions or refresh data when app becomes active
        console.log('App has become active!');
      }
    });
    this.listeners.push(() => subscription.remove());
  }
}

// Export singleton instance
export const notificationsService = NotificationsService.getInstance();

// Export the service instance and initialization function
export const initNotifications = async (): Promise<boolean> => {
  try {
    console.log('🔔 Initializing notifications service...');
    const permissionGranted = await notificationsService.requestPermissions();

    if (permissionGranted) {
      console.log('🔔 Notifications initialized successfully');
    } else {
      console.log('🔔 Notifications initialized but permission denied');
    }

    return permissionGranted;
  } catch (error) {
    console.error('🔔 Failed to initialize notifications:', error);
    return false;
  }
};

// Convenience functions for use throughout the app
export const scheduleLocalNotification = (options: LocalNotificationOptions) =>
  notificationsService.scheduleLocalNotification(options);
export const scheduleContractProcessed = (
  contractName: string, 
  sessionId: string, 
  translatedTitle?: string, 
  translatedBody?: string
) =>
  notificationsService.scheduleContractProcessedNotification(contractName, sessionId, translatedTitle, translatedBody);
export const scheduleOrderStatus = (status: string, orderId: string) =>
  notificationsService.scheduleOrderStatusNotification(status, orderId);

// --- Tutorial Screen Logic ---
const TUTORIAL_SEEN_KEY = 'hasSeenTutorial';

export const checkAndShowTutorial = async (navigation: any) => {
  try {
    const hasSeenTutorial = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
    if (hasSeenTutorial === 'true') {
      navigation.replace('MainApp'); // Replace with your main app screen name
    } else {
      navigation.replace('Tutorial'); // Replace with your tutorial screen name
    }
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    // Fallback: show tutorial if there's an error reading from storage
    navigation.replace('Tutorial');
  }
};

export const markTutorialAsSeen = async () => {
  try {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    console.log('Tutorial marked as seen.');
  } catch (error) {
    console.error('Error marking tutorial as seen:', error);
  }
};

// --- Android Back Button Handling ---
export const setupAndroidBackButton = (navigation: any) => {
  const backAction = () => {
    const canGoBack = navigation.canGoBack();
    if (canGoBack) {
      navigation.goBack();
      return true; // Event handled
    } else {
      // If on the root screen, exit the app
      if (navigation.getState().routes[0].name === navigation.getCurrentRoute().name) {
        BackHandler.exitApp();
        return true; // App exited
      } else {
        // If not on the root screen and can't go back (shouldn't happen with proper navigation),
        // exit the app as a failsafe.
        BackHandler.exitApp();
        return true;
      }
    }
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

  // Return a cleanup function
  return () => {
    backHandler.remove();
  };
};

// --- Mocking History Fetch for Local First ---
// This section assumes you have local session/analysis data and a way to fetch it.
// Replace with your actual local data loading logic.

// Example: Mock local data
interface Session {
  id: string;
  name: string;
  createdAt: string;
}

interface Analysis {
  id: string;
  sessionId: string;
  result: string;
}

// Function to load local sessions/analyses
export const loadLocalSessionsAndAnalyses = async (): Promise<{ sessions: Session[], analyses: Analysis[] }> => {
  try {
    console.log('Loading local sessions and analyses...');
    // Replace with your actual AsyncStorage/SecureStore retrieval logic
    const storedSessions = await AsyncStorage.getItem('localSessions');
    const storedAnalyses = await AsyncStorage.getItem('localAnalyses');

    const sessions = storedSessions ? JSON.parse(storedSessions) : [];
    const analyses = storedAnalyses ? JSON.parse(storedAnalyses) : [];

    console.log(`Loaded ${sessions.length} local sessions and ${analyses.length} local analyses.`);
    return { sessions, analyses };
  } catch (error) {
    console.error('Error loading local sessions/analyses:', error);
    return { sessions: [], analyses: [] };
  }
};

// Function to simulate fetching remote data (to be disabled/bypassed)
const fetchRemoteHistory = async (): Promise<{ sessions: Session[], analyses: Analysis[] }> => {
  console.warn('Remote history fetch is disabled or bypassed.');
  // In a real scenario, this would be a fetch call.
  // For now, it returns empty or mock data, or is simply not called.
  return { sessions: [], analyses: [] };
};

// This function would be called on app startup to load data.
// It prioritizes local data.
export const initializeAppData = async () => {
  await SplashScreen.preventAutoHideAsync(); // Keep splash screen visible

  try {
    // Load local data immediately
    const localData = await loadLocalSessionsAndAnalyses();
    console.log('Local data loaded:', localData);

    // Bypass or disable remote fetch entirely
    // const remoteData = await fetchRemoteHistory(); // This call is effectively removed or bypassed

    // Combine or use local data directly
    const allData = {
      sessions: localData.sessions,
      analyses: localData.analyses,
      // You might have logic here to merge remote data if it were enabled
    };

    console.log('App data initialized with local data:', allData);

    // Now you can use `allData` to render your initial state
    // For example, if you have a context or state management
    // Dispatch an action or update state with allData

  } catch (error) {
    console.error('Error initializing app data:', error);
    // Handle error, maybe show an error screen or load a default state
  } finally {
    await SplashScreen.hideAsync(); // Hide splash screen once data is loaded/processed
  }
};