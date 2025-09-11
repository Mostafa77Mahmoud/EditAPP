import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSessionDetails, getSessionTerms } from './api';
import { storeSessionData } from '../utils/storage';
import { updateSessionsIndex } from '../utils/analytics';

const BACKGROUND_UPLOAD_TASK = 'BACKGROUND_UPLOAD_TASK';
const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';
const BACKGROUND_PROCESSING_TASK = 'BACKGROUND_PROCESSING_TASK';

interface BackgroundUpload {
  id: string;
  sessionId: string;
  file: any;
  startTime: number;
  retryCount: number;
}

interface BackgroundProcessing {
  sessionId: string;
  startTime: number;
  retryCount: number;
  maxRetries: number;
}

class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private isInitialized = false;
  private keepAwakeActive = false;
  private activeUploads = new Map<string, BackgroundUpload>();
  private activeProcessing = new Map<string, BackgroundProcessing>();

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing Background Task Manager...');

      // First define all background tasks synchronously
      this.defineBackgroundTasksSync();

      // Verify all tasks are properly defined
      const tasksToVerify = [BACKGROUND_UPLOAD_TASK, BACKGROUND_SYNC_TASK, BACKGROUND_PROCESSING_TASK];
      const definedTasks = tasksToVerify.filter(taskName => TaskManager.isTaskDefined(taskName));

      console.log(`📋 Verified ${definedTasks.length}/${tasksToVerify.length} background tasks defined:`, definedTasks);

      if (definedTasks.length === 0) {
        console.warn('⚠️ No background tasks defined, skipping registration');
        this.isInitialized = true;
        return;
      }

      // Register only the successfully defined tasks
      if (TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
        try {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 30, // 30 seconds minimum interval
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('✅ BACKGROUND_SYNC_TASK registered successfully');
        } catch (registerError) {
          console.warn('⚠️ Failed to register BACKGROUND_SYNC_TASK:', registerError);
        }
      }

      console.log('✅ Background Task Manager initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Background Task Manager:', error);
      // Don't throw error to prevent app crash
      console.warn('⚠️ Continuing without background tasks');
      this.isInitialized = true;
    }
  }

  private defineBackgroundTasksSync(): void {
    console.log('🔧 Defining background tasks...');

    try {
      // Define BACKGROUND_UPLOAD_TASK
      if (!TaskManager.isTaskDefined(BACKGROUND_UPLOAD_TASK)) {
        TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async ({ data, error }) => {
          if (error) {
            console.error('❌ Background upload task error:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }

          try {
            console.log('🔄 Running background upload task');
            // Get fresh instance to avoid stale context
            const manager = BackgroundTaskManager.getInstance();
            await manager.processBackgroundUploads();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (err) {
            console.error('❌ Background upload processing failed:', err);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
        console.log('✅ Defined BACKGROUND_UPLOAD_TASK');
      } else {
        console.log('ℹ️ BACKGROUND_UPLOAD_TASK already defined');
      }

      // Define BACKGROUND_SYNC_TASK
      if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
        TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error }) => {
          if (error) {
            console.error('❌ Background sync task error:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }

          try {
            console.log('🔄 Running background sync task');
            // Get fresh instance to avoid stale context
            const manager = BackgroundTaskManager.getInstance();
            const hasNewData = await manager.syncPendingData();
            return hasNewData 
              ? BackgroundFetch.BackgroundFetchResult.NewData 
              : BackgroundFetch.BackgroundFetchResult.NoData;
          } catch (err) {
            console.error('❌ Background sync failed:', err);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
        console.log('✅ Defined BACKGROUND_SYNC_TASK');
      } else {
        console.log('ℹ️ BACKGROUND_SYNC_TASK already defined');
      }

      // Define BACKGROUND_PROCESSING_TASK
      if (!TaskManager.isTaskDefined(BACKGROUND_PROCESSING_TASK)) {
        TaskManager.defineTask(BACKGROUND_PROCESSING_TASK, async ({ data, error }) => {
          if (error) {
            console.error('❌ Background processing task error:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }

          try {
            console.log('🔄 Running background processing task');
            // Get fresh instance to avoid stale context
            const manager = BackgroundTaskManager.getInstance();
            await manager.processActiveAnalyses();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (err) {
            console.error('❌ Background processing failed:', err);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
        console.log('✅ Defined BACKGROUND_PROCESSING_TASK');
      } else {
        console.log('ℹ️ BACKGROUND_PROCESSING_TASK already defined');
      }

      console.log('✅ All background tasks defined successfully');

    } catch (error) {
      console.error('❌ Error defining background tasks:', error);
      throw error; // Re-throw to be caught by initialize()
    }
  }

  async startBackgroundUpload(sessionId: string, file: any): Promise<void> {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;

    console.log('🚀 Starting background upload:', { sessionId, uploadId });

    // Store upload data
    const upload: BackgroundUpload = {
      id: uploadId,
      sessionId,
      file,
      startTime: Date.now(),
      retryCount: 0,
    };

    this.activeUploads.set(uploadId, upload);

    // Persist to storage
    await this.persistActiveUploads();

    // Activate keep awake during upload
    await this.activateKeepAwake();

    // Schedule background task only if defined
    try {
      if (TaskManager.isTaskDefined(BACKGROUND_UPLOAD_TASK)) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK, {
          minimumInterval: 15, // Increased interval for stability
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('✅ Background upload task registered');
      } else {
        console.warn('⚠️ Background upload task not defined, skipping registration');
        // Continue without background task - foreground handling will work
      }
    } catch (error) {
      console.warn('⚠️ Failed to register background upload task:', error);
      // Continue without background task registration
    }
  }

  async startBackgroundProcessing(sessionId: string): Promise<void> {
    console.log('🔄 Starting background processing for session:', sessionId);

    const processing: BackgroundProcessing = {
      sessionId,
      startTime: Date.now(),
      retryCount: 0,
      maxRetries: 50, // Increased for 12-minute timeout
    };

    this.activeProcessing.set(sessionId, processing);

    // Persist to storage
    await this.persistActiveProcessing();

    // Activate keep awake during processing
    await this.activateKeepAwake();

    // Schedule background processing task only if defined
    try {
      if (TaskManager.isTaskDefined(BACKGROUND_PROCESSING_TASK)) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_PROCESSING_TASK, {
          minimumInterval: 15, // 15 seconds for processing checks
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('✅ Background processing task registered');
      } else {
        console.warn('⚠️ Background processing task not defined, skipping registration');
      }
    } catch (error) {
      console.warn('⚠️ Failed to register background processing task:', error);
    }
  }

  async processBackgroundUploads(): Promise<void> {
    const uploads = await this.loadActiveUploads();

    for (const [uploadId, upload] of Array.from(uploads.entries())) {
      try {
        console.log('📤 Processing background upload:', uploadId);

        // Import API dynamically to avoid circular dependencies
        const apiModule = await import('./api');
        const { uploadContract } = apiModule;

        // Perform upload
        const response = await uploadContract(upload.file, () => {});

        if (response && response.session_id) {
          console.log('✅ Background upload completed:', response.session_id);

          // Start background processing for analysis
          await this.startBackgroundProcessing(response.session_id);

          // Remove completed upload
          this.activeUploads.delete(uploadId);
          await this.persistActiveUploads();

          // Send notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upload Complete',
              body: 'Your contract has been uploaded and analysis is starting. Please keep the app open.',
              data: { sessionId: response.session_id, type: 'upload_complete' },
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.error('❌ Background upload failed:', error);
        upload.retryCount++;

        if (upload.retryCount >= 3) {
          // Max retries reached
          console.log('❌ Max retries reached for upload:', uploadId);
          this.activeUploads.delete(uploadId);
          await this.persistActiveUploads();

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upload Failed',
              body: 'Your contract upload failed after multiple attempts.',
              data: { uploadId, type: 'upload_failed' },
            },
            trigger: null,
          });
          
          // Deactivate keep awake since upload failed
          console.log('😴 Deactivating keep awake - upload failed');
          try {
            await this.deactivateKeepAwake();
          } catch (error) {
            console.warn('⚠️ Failed to deactivate keep awake after upload failure:', error);
          }
        } else {
          this.activeUploads.set(uploadId, upload);
          await this.persistActiveUploads();
        }
      }
    }

    // Deactivate keep awake if no active uploads
    if (this.activeUploads.size === 0) {
      await this.deactivateKeepAwake();
    }
  }

  async processActiveAnalyses(): Promise<void> {
    const processing = await this.loadActiveProcessing();

    for (const [sessionId, process] of Array.from(processing.entries())) {
      try {
        console.log('🔍 Checking background analysis:', sessionId);

        // Extract clean session ID for API calls
        const cleanSessionId = this.extractCleanSessionId(sessionId);
        console.log(`🔍 Using clean session ID: ${sessionId} -> ${cleanSessionId}`);

        // Check if analysis is complete
        const sessionData = await getSessionDetails(cleanSessionId);
        const hasAnalysisResults = Boolean(
          Array.isArray(sessionData.analysis_results) &&
          sessionData.analysis_results.length > 0
        );

        const hasAnalysisTimestamp = Boolean(
          sessionData.analysis_timestamp &&
          typeof sessionData.analysis_timestamp === 'string' &&
          sessionData.analysis_timestamp.trim() !== ""
        );

        if (hasAnalysisTimestamp && hasAnalysisResults) {
          console.log('✅ Background analysis completed:', sessionId);

          // Fetch complete data
          const termsData = await getSessionTerms(cleanSessionId);
          const fullSessionData = {
            ...sessionData,
            analysis_results: termsData || [],
          };

          // Store the completed analysis
          await storeSessionData(fullSessionData);
          await updateSessionsIndex(cleanSessionId);

          // Update contract in ContractContext (this will trigger notification)
          try {
            // The contract update will be handled by the ContractContext automatically
            console.log('🔄 Analysis completed and stored - ContractContext will handle updates...');
          } catch (importError) {
            console.warn('⚠️ Could not update ContractContext:', importError);
          }

          // Remove from active processing
          this.activeProcessing.delete(sessionId);
          await this.persistActiveProcessing();
        } else {
          // Still processing, increment retry count
          process.retryCount++;

          if (process.retryCount >= process.maxRetries) {
            console.log('⏰ Background analysis timeout:', sessionId);
            this.activeProcessing.delete(sessionId);
            await this.persistActiveProcessing();

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Analysis Taking Longer',
                body: 'Your contract analysis is still processing. Please check back later.',
                data: { sessionId: cleanSessionId, type: 'analysis_timeout' },
              },
              trigger: null,
            });
            
            // Deactivate keep awake since analysis timed out
            console.log('😴 Deactivating keep awake - background analysis timed out');
            try {
              await this.deactivateKeepAwake();
            } catch (error) {
              console.warn('⚠️ Failed to deactivate keep awake after background timeout:', error);
            }
          } else {
            this.activeProcessing.set(sessionId, process);
            await this.persistActiveProcessing();
          }
        }
      } catch (error) {
        console.error('❌ Background analysis check failed:', error);

        // Check if error indicates session doesn't exist
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (errorMessage.includes('االجلسة غير موجودة') || 
              errorMessage.includes('Session not found') ||
              errorMessage.includes('404')) {
            console.log(`🛑 Session not found, removing from background processing: ${sessionId}`);
            this.activeProcessing.delete(sessionId);
            await this.persistActiveProcessing();
            continue; // Skip to next session
          }
        }

        process.retryCount++;

        if (process.retryCount >= process.maxRetries) {
          this.activeProcessing.delete(sessionId);
          await this.persistActiveProcessing();

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Analysis Error',
              body: 'There was an issue with your contract analysis. Please try again.',
              data: { sessionId, type: 'analysis_error' },
            },
            trigger: null,
          });
          
          // Deactivate keep awake since analysis failed
          console.log('😴 Deactivating keep awake - background analysis failed');
          try {
            await this.deactivateKeepAwake();
          } catch (error) {
            console.warn('⚠️ Failed to deactivate keep awake after background error:', error);
          }
        } else {
          this.activeProcessing.set(sessionId, process);
          await this.persistActiveUploads();
        }
      }
    }

    // Deactivate keep awake if no active processing
    if (this.activeProcessing.size === 0) {
      await this.deactivateKeepAwake();
    }
  }

  private extractCleanSessionId(sessionId: string): string {
    // Handle different session ID formats like ProcessingService
    if (sessionId.startsWith('session_')) {
      const withoutPrefix = sessionId.substring(8);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(withoutPrefix)) {
        return withoutPrefix;
      }
      return sessionId;
    }
    return sessionId;
  }

  async syncPendingData(): Promise<boolean> {
    let hasNewData = false;

    try {
      // Restore active tasks from storage
      await this.loadActiveUploads();
      await this.loadActiveProcessing();

      // Process any pending uploads
      if (this.activeUploads.size > 0) {
        await this.processBackgroundUploads();
        hasNewData = true;
      }

      // Process any pending analyses
      if (this.activeProcessing.size > 0) {
        await this.processActiveAnalyses();
        hasNewData = true;
      }

      return hasNewData;
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      return false;
    }
  }

  private async activateKeepAwake(): Promise<void> {
    if (!this.keepAwakeActive) {
      await activateKeepAwake();
      this.keepAwakeActive = true;
      console.log('⏰ Keep awake activated');
    }
  }

  private async deactivateKeepAwake(): Promise<void> {
    if (this.keepAwakeActive && 
        this.activeUploads.size === 0 && 
        this.activeProcessing.size === 0) {
      await deactivateKeepAwake();
      this.keepAwakeActive = false;
      console.log('😴 Keep awake deactivated');
    }
  }

  private async persistActiveUploads(): Promise<void> {
    try {
      const uploadsArray = Array.from(this.activeUploads.entries());
      await AsyncStorage.setItem('activeBackgroundUploads', JSON.stringify(uploadsArray));
    } catch (error) {
      console.error('❌ Failed to persist active uploads:', error);
    }
  }

  private async loadActiveUploads(): Promise<Map<string, BackgroundUpload>> {
    try {
      const stored = await AsyncStorage.getItem('activeBackgroundUploads');
      if (stored) {
        const uploadsArray = JSON.parse(stored);
        this.activeUploads = new Map(uploadsArray);
      }
      return this.activeUploads;
    } catch (error) {
      console.error('❌ Failed to load active uploads:', error);
      return new Map();
    }
  }

  private async persistActiveProcessing(): Promise<void> {
    try {
      const processingArray = Array.from(this.activeProcessing.entries());
      await AsyncStorage.setItem('activeBackgroundProcessing', JSON.stringify(processingArray));
    } catch (error) {
      console.error('❌ Failed to persist active processing:', error);
    }
  }

  private async loadActiveProcessing(): Promise<Map<string, BackgroundProcessing>> {
    try {
      const stored = await AsyncStorage.getItem('activeBackgroundProcessing');
      if (stored) {
        const processingArray = JSON.parse(stored);
        this.activeProcessing = new Map(processingArray);
      }
      return this.activeProcessing;
    } catch (error) {
      console.error('❌ Failed to load active processing:', error);
      return new Map();
    }
  }

  async stopBackgroundProcessing(sessionId: string): Promise<void> {
    this.activeProcessing.delete(sessionId);
    await this.persistActiveProcessing();

    if (this.activeProcessing.size === 0) {
      await this.deactivateKeepAwake();
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Background Task Manager');

    // Unregister all tasks
    try {
      await TaskManager.unregisterAllTasksAsync();
    } catch (error) {
      console.warn('⚠️ Failed to unregister tasks:', error);
    }

    // Deactivate keep awake
    await this.deactivateKeepAwake();

    // Clear active tasks
    this.activeUploads.clear();
    this.activeProcessing.clear();

    // Clear storage
    await AsyncStorage.removeItem('activeBackgroundUploads');
    await AsyncStorage.removeItem('activeBackgroundProcessing');
  }

  getActiveTasksCount(): { uploads: number; processing: number } {
    return {
      uploads: this.activeUploads.size,
      processing: this.activeProcessing.size,
    };
  }
}

export default BackgroundTaskManager;