import * as Notifications from "expo-notifications";
import { AppState, AppStateStatus } from "react-native";
import { updateSessionsIndex } from "../utils/analytics";
import BackgroundTaskManager from "./BackgroundTaskManager";
import { deactivateKeepAwake } from "expo-keep-awake";

interface AnalysisJob {
  sessionId: string;
  startTime: number;
  pollInterval: NodeJS.Timeout | null;
  retryCount: number;
  maxRetries: number;
}

class ProcessingService {
  private static instance: ProcessingService;
  private activeJobs: Map<string, AnalysisJob> = new Map();
  private appState: AppStateStatus = "active";
  private initialized = false;

  static getInstance(): ProcessingService {
    if (!ProcessingService.instance) {
      ProcessingService.instance = new ProcessingService();
    }
    return ProcessingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize background task manager
      const backgroundTaskManager = BackgroundTaskManager.getInstance();
      await backgroundTaskManager.initialize();

      // Listen to app state changes
      const subscription = AppState.addEventListener(
        "change",
        this.handleAppStateChange,
      );

      // Store subscription for cleanup
      (this as any).appStateSubscription = subscription;

      this.initialized = true;
      console.log("✅ ProcessingService initialized with background support");
    } catch (error) {
      console.error("❌ ProcessingService initialization failed:", error);

      // Still initialize the basic service without background support
      const subscription = AppState.addEventListener(
        "change",
        this.handleAppStateChange,
      );
      (this as any).appStateSubscription = subscription;

      this.initialized = true;
      console.log("✅ ProcessingService initialized without background support");
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log(`📱 App state changed: ${this.appState} -> ${nextAppState}`, {
      activeJobs: this.activeJobs.size,
      jobIds: Array.from(this.activeJobs.keys())
    });

    if (
      this.appState === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      // App going to background - continue polling for a limited time
      console.log(
        "📱 App backgrounded, maintaining analysis progress...",
      );
      this.adjustPollingForBackground();

      // Persist current analysis state
      this.persistAnalysisState();
    } else if (
      this.appState.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      // App coming to foreground - resume normal polling
      console.log("📱 App foregrounded, resuming analysis tracking...");

      // Restore analysis state first
      this.restoreAnalysisState();
      this.adjustPollingForForeground();
    }

    this.appState = nextAppState;
  };

  async startAnalysis(sessionId: string): Promise<void> {
    console.log(`🚀 Starting analysis tracking for session: ${sessionId}`);

    // Stop any existing job for this session
    this.stopAnalysis(sessionId);

    // Create new job
    const job: AnalysisJob = {
      sessionId,
      startTime: Date.now(),
      pollInterval: null,
      retryCount: 0,
      maxRetries: 50, // Increased retries to accommodate 12-minute upload timeout
    };

    this.activeJobs.set(sessionId, job);

    // Start both foreground polling and background processing
    this.startPolling(job);

    // Start background processing
    const backgroundTaskManager = BackgroundTaskManager.getInstance();
    await backgroundTaskManager.startBackgroundProcessing(sessionId);

    // Update sessions index
    await updateSessionsIndex(sessionId);
  }

  stopAnalysis(sessionId: string): void {
    const job = this.activeJobs.get(sessionId);
    if (job) {
      console.log(`⏹️ Stopping analysis tracking for session: ${sessionId}`);
      if (job.pollInterval) {
        clearInterval(job.pollInterval);
      }
      this.activeJobs.delete(sessionId);
    }
  }

  private startPolling(job: AnalysisJob): void {
    const pollFunction = async () => {
      try {
        console.log(
          `🔄 Polling attempt ${job.retryCount + 1}/${job.maxRetries} for session: ${job.sessionId}`,
        );
        const isComplete = await this.checkJobStatus(job.sessionId);

        if (isComplete) {
          console.log(`✅ Analysis completed for session: ${job.sessionId}`);
          await this.handleAnalysisComplete(job.sessionId);
          this.stopAnalysis(job.sessionId);
        } else {
          job.retryCount++;
          console.log(
            `⏳ Analysis not ready yet, retry ${job.retryCount}/${job.maxRetries} for session: ${job.sessionId}`,
          );

          // Check if we should stop early due to session not found
          if (job.retryCount >= 5) { // After 5 attempts, check for session existence more aggressively
            const shouldStop = await this.shouldStopPolling(job.sessionId);
            if (shouldStop) {
              console.log(`🛑 Stopping analysis for non-existent session: ${job.sessionId}`);
              await this.handleAnalysisError(job.sessionId, new Error('Session not found on server'));
              this.stopAnalysis(job.sessionId);
              return;
            }
          }

          if (job.retryCount >= job.maxRetries) {
            console.log(`⏰ Max retries reached for session: ${job.sessionId}`);
            await this.handleAnalysisTimeout(job.sessionId);
            this.stopAnalysis(job.sessionId);
          }
        }
      } catch (error) {
        console.error(`❌ Polling error for session ${job.sessionId}:`, error);
        job.retryCount++;

        // Check if error indicates session doesn't exist
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (errorMessage.includes('االجلسة غير موجودة') || 
              errorMessage.includes('Session not found') ||
              errorMessage.includes('404')) {
            console.log(`🛑 Session not found, stopping analysis for: ${job.sessionId}`);
            await this.handleAnalysisError(job.sessionId, error);
            this.stopAnalysis(job.sessionId);
            return;
          }
        }

        if (job.retryCount >= job.maxRetries) {
          await this.handleAnalysisError(job.sessionId, error);
          this.stopAnalysis(job.sessionId);
        }
      }
    };

    // Start with 2s, then gradual increase
    const getInterval = () => Math.min(2000 + job.retryCount * 1000, 15000);

    job.pollInterval = setInterval(pollFunction, getInterval()) as any;

    // Call once immediately after a short delay
    setTimeout(pollFunction, 1000);
  }

  private async shouldStopPolling(sessionId: string): Promise<boolean> {
    try {
      // Try a quick check to see if session exists at all
      const apiModule = await import("./api");
      const { getSessionDetails } = apiModule;
      const cleanSessionId = this.extractCleanSessionId(sessionId);

      await getSessionDetails(cleanSessionId);
      return false; // Session exists, continue polling
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('االجلسة غير موجودة') || 
            errorMessage.includes('Session not found') ||
            errorMessage.includes('404')) {
          console.log(`🛑 Session ${sessionId} not found on server after validation`);
          return true; // Session doesn't exist, stop polling
        }
      }
      return false; // Other error, continue polling
    }
  }

  private async checkJobStatus(sessionId: string): Promise<boolean> {
    try {
      // Import API service dynamically to avoid circular deps
      const apiModule = await import("./api");
      const { getSessionDetails } = apiModule;

      // Extract clean session ID from prefixed format
      const cleanSessionId = this.extractCleanSessionId(sessionId);
      console.log(`🔍 Checking status for session: ${sessionId} -> ${cleanSessionId}`);

      // Use the clean session ID for API calls
      const data = await getSessionDetails(cleanSessionId);

      // Check if analysis is complete based on having analysis results
      const hasAnalysisResults = Boolean(
        Array.isArray(data.analysis_results) &&
        data.analysis_results.length > 0
      );

      const hasAnalysisTimestamp = Boolean(
        data.analysis_timestamp &&
        typeof data.analysis_timestamp === "string" &&
        data.analysis_timestamp.trim() !== ""
      );

      // Analysis is complete if we have timestamp AND results
      const isComplete = Boolean(hasAnalysisTimestamp && hasAnalysisResults);

      if (isComplete) {
        console.log(`✅ Analysis completion detected for ${sessionId}:`, {
          resultsCount: data.analysis_results.length,
          compliancePercentage: data.compliance_percentage,
          analysisTimestamp: data.analysis_timestamp,
        });
      } else if (hasAnalysisTimestamp && !hasAnalysisResults) {
        console.log(`⚠️ Analysis timestamp exists but no results yet for ${sessionId}`);

        // Try to fetch terms separately if main response doesn't have them
        try {
          const termsModule = await import("./api");
          const { getSessionTerms } = termsModule;
          const terms = await getSessionTerms(cleanSessionId);

          if (terms && terms.length > 0) {
            console.log(`✅ Found ${terms.length} terms via separate terms endpoint`);
            return true; // Analysis is actually complete
          }
        } catch (termsError) {
          console.warn(`⚠️ Failed to fetch terms separately:`, termsError);
        }
      }

      return isComplete;
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.warn(`⚠️ Status check failed for ${sessionId}:`, errorMessage);

        // Check for specific error patterns that indicate the session doesn't exist
        if (errorMessage.includes('االجلسة غير موجودة') || 
            errorMessage.includes('Session not found') ||
            errorMessage.includes('404')) {
          console.log(`❌ Session ${sessionId} not found on server, stopping analysis`);
          // Return false and let the retry logic handle stopping
          return false;
        }
      } else {
        console.warn(`⚠️ Unknown error while checking status for ${sessionId}:`, error);
      }
      return false;
    }
  }

  private extractCleanSessionId(sessionId: string): string {
    // Handle different session ID formats:
    // "session_1757489849297_825lpm2lt" -> extract the actual UUID if present
    // "session_5dcb178e-9c77-408f-9ab1-b1eb307b68c3" -> "5dcb178e-9c77-408f-9ab1-b1eb307b68c3"
    // "5dcb178e-9c77-408f-9ab1-b1eb307b68c3" -> "5dcb178e-9c77-408f-9ab1-b1eb307b68c3"

    if (sessionId.startsWith('session_')) {
      const withoutPrefix = sessionId.substring(8); // Remove "session_" prefix

      // Check if it's a UUID format
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(withoutPrefix)) {
        return withoutPrefix;
      }

      // If it's not a UUID, it might be a temporary session ID - return as is
      return sessionId;
    }

    return sessionId;
  }

  private async checkAllActiveJobs(): Promise<void> {
    const promises = Array.from(this.activeJobs.keys()).map((sessionId) =>
      this.checkJobStatus(sessionId).then((isComplete) => ({
        sessionId,
        isComplete,
      })),
    );

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.isComplete) {
        this.handleAnalysisComplete(result.value.sessionId);
        this.stopAnalysis(result.value.sessionId);
      }
    });
  }

  private async handleAnalysisComplete(sessionId: string): Promise<void> {
    console.log(`🎉 Analysis complete for session: ${sessionId}`);

    // Deactivate keep awake since analysis is complete
    console.log('😴 Deactivating keep awake - analysis completed in ProcessingService');
    try {
      await deactivateKeepAwake();
    } catch (error) {
      console.warn('⚠️ Failed to deactivate keep awake in ProcessingService:', error);
    }

    // Schedule local notification for analysis completion
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Analysis Complete",
        body: "Your contract analysis is ready to view.",
        data: {
          type: "analysis_complete",
          sessionId,
          autoNavigate: true, // Flag for auto-navigation
        },
      },
      trigger: null, // Immediate
    });
  }

  private async handleAnalysisTimeout(sessionId: string): Promise<void> {
    console.log(`⏰ Analysis timeout for session: ${sessionId}`);

    // Deactivate keep awake since analysis has timed out
    console.log('😴 Deactivating keep awake - analysis timed out');
    try {
      await deactivateKeepAwake();
    } catch (error) {
      console.warn('⚠️ Failed to deactivate keep awake after timeout:', error);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Analysis Taking Longer",
        body: "Your contract analysis is still processing. Please check back later.",
        data: {
          type: "analysis_timeout",
          sessionId,
        },
      },
      trigger: null,
    });
  }

  private async handleAnalysisError(
    sessionId: string,
    error: any,
  ): Promise<void> {
    console.log(`❌ Analysis error for session: ${sessionId}`, error);

    // Deactivate keep awake since analysis has failed
    console.log('😴 Deactivating keep awake - analysis failed');
    try {
      await deactivateKeepAwake();
    } catch (deactivateError) {
      console.warn('⚠️ Failed to deactivate keep awake after error:', deactivateError);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Analysis Error",
        body: "There was an issue with your contract analysis. Please try again.",
        data: {
          type: "analysis_error",
          sessionId,
        },
      },
      trigger: null,
    });
  }

  private adjustPollingForBackground(): void {
    // Reduce polling frequency in background
    this.activeJobs.forEach((job, sessionId) => {
      if (job.pollInterval) {
        clearInterval(job.pollInterval);
        // Poll every 15s in background (instead of escalating interval)
        job.pollInterval = setInterval(async () => {
          const isComplete = await this.checkJobStatus(sessionId);
          if (isComplete) {
            await this.handleAnalysisComplete(sessionId);
            this.stopAnalysis(sessionId);
          }
        }, 15000) as any;
      }
    });
  }

  private adjustPollingForForeground(): void {
    // Resume normal polling intervals
    this.activeJobs.forEach((job) => {
      if (job.pollInterval) {
        clearInterval(job.pollInterval);
        this.startPolling(job);
      }
    });
  }

  cleanup(): void {
    this.activeJobs.forEach((job) => {
      if (job.pollInterval) {
        clearInterval(job.pollInterval);
      }
    });
    this.activeJobs.clear();

    // Remove AppState listener
    if ((this as any).appStateSubscription) {
      (this as any).appStateSubscription.remove();
    }

    // Cleanup background task manager
    BackgroundTaskManager.getInstance().cleanup();
  }

  private async persistAnalysisState(): Promise<void> {
    try {
      const jobsArray = Array.from(this.activeJobs.entries()).map(([sessionId, job]) => ({
        sessionId,
        startTime: job.startTime,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      }));

      const { storage } = await import('../utils/storage');
      await storage.setItemAsync('active_analysis_jobs', JSON.stringify(jobsArray));
      console.log('💾 Persisted analysis state for', jobsArray.length, 'jobs');
    } catch (error) {
      console.error('❌ Failed to persist analysis state:', error);
    }
  }

  private async restoreAnalysisState(): Promise<void> {
    try {
      const { storage } = await import('../utils/storage');
      const stored = await storage.getItemAsync('active_analysis_jobs');

      if (stored) {
        const jobsArray = JSON.parse(stored);
        console.log('🔄 Restoring analysis state for', jobsArray.length, 'jobs');

        for (const jobData of jobsArray) {
          if (!this.activeJobs.has(jobData.sessionId)) {
            const job: AnalysisJob = {
              sessionId: jobData.sessionId,
              startTime: jobData.startTime,
              pollInterval: null,
              retryCount: jobData.retryCount,
              maxRetries: jobData.maxRetries
            };

            this.activeJobs.set(jobData.sessionId, job);
            this.startPolling(job);

            // Re-initialize background processing
            const backgroundTaskManager = BackgroundTaskManager.getInstance();
            await backgroundTaskManager.startBackgroundProcessing(jobData.sessionId);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to restore analysis state:', error);
    }
  }

  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }
}

export default ProcessingService;