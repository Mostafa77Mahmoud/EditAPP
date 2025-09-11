import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SessionDetailsApiResponse } from '../services/api';
import * as Crypto from 'expo-crypto';

// Maximum storage size for SecureStore (2KB limit)
const MAX_SECURE_STORE_SIZE = 2048;

// Enhanced interface for offline contract analysis storage
export interface OfflineContractAnalysis {
  id: string;
  sessionId: string;
  pdfUrl?: string;
  localPdfPath?: string;
  originalFilename: string;
  summary: string;
  complianceScore: number;
  flags: string[];
  analysisDate: string;
  isOfflineOnly?: boolean;
  termsCount: number;
  issuesCount: number;
  language: 'ar' | 'en';
  fullSessionData?: SessionDetailsApiResponse;
}

// Storage interface for cross-platform compatibility
interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Enhanced logging function for storage operations
const logStorageOperation = (operation: string, key: string, value?: any, error?: any) => {
  const timestamp = new Date().toISOString();
  const valueInfo = value ? `(${typeof value}, ${JSON.stringify(value).length} chars)` : 'N/A';

  if (error) {
    console.error(`[${timestamp}] 🔴 Storage ${operation} FAILED - Key: "${key}", Value: ${valueInfo}, Error:`, error);
  } else {
    console.log(`[${timestamp}] 🟢 Storage ${operation} - Key: "${key}", Value: ${valueInfo}`);
  }
};

// Improved validate and sanitize keys for SecureStore
const sanitizeKey = (key: string | undefined | null): string => {
  // Detailed logging for key validation
  console.log(`🔑 Sanitizing key: "${key}" (type: ${typeof key})`);

  if (key === null) {
    const error = new Error('Storage key cannot be null');
    logStorageOperation('SANITIZE', 'null', null, error);
    throw error;
  }

  if (key === undefined) {
    const error = new Error('Storage key cannot be undefined');
    logStorageOperation('SANITIZE', 'undefined', null, error);
    throw error;
  }

  if (typeof key !== 'string') {
    const error = new Error(`Storage key must be a string, received: ${typeof key}`);
    logStorageOperation('SANITIZE', String(key), null, error);
    throw error;
  }

  if (key.trim().length === 0) {
    const error = new Error('Storage key cannot be empty or only whitespace');
    logStorageOperation('SANITIZE', key, null, error);
    throw error;
  }

  // Remove invalid characters and ensure key follows SecureStore requirements
  // Only alphanumeric, dots, hyphens, and underscores are allowed
  const trimmedKey = key.trim();
  const sanitized = trimmedKey.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (sanitized.length === 0) {
    const error = new Error('Storage key contains no valid characters after sanitization');
    logStorageOperation('SANITIZE', key, null, error);
    throw error;
  }

  // Ensure key doesn't start with a number (some systems don't like this)
  const finalKey = /^[0-9]/.test(sanitized) ? `key_${sanitized}` : sanitized;

  // Maximum key length check (SecureStore has limits)
  if (finalKey.length > 100) {
    const truncatedKey = finalKey.substring(0, 97) + '_tr';
    console.warn(`🔑 Key too long, truncated: "${finalKey}" -> "${truncatedKey}"`);
    return truncatedKey;
  }

  console.log(`🔑 Key sanitized: "${key}" -> "${finalKey}"`);
  return finalKey;
};

// Enhanced value validation
const validateValue = (value: any): string => {
  if (value === null) {
    throw new Error('Storage value cannot be null');
  }

  if (value === undefined) {
    throw new Error('Storage value cannot be undefined');
  }

  if (typeof value !== 'string') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Storage value must be serializable to string: ${error}`);
    }
  }

  return value;
};

// Web storage fallback with enhanced error handling
const webStorage: StorageInterface = {
  getItem: async (key: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = localStorage.getItem(sanitizedKey);
        logStorageOperation('WEB_GET', sanitizedKey, value);
        return value;
      }
      logStorageOperation('WEB_GET', sanitizedKey, null, new Error('localStorage not available'));
      return null;
    } catch (error) {
      logStorageOperation('WEB_GET', key, null, error);
      throw error;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      const validatedValue = validateValue(value);

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(sanitizedKey, validatedValue);
        logStorageOperation('WEB_SET', sanitizedKey, validatedValue);
      } else {
        throw new Error('localStorage not available');
      }
    } catch (error) {
      logStorageOperation('WEB_SET', key, value, error);
      throw error;
    }
  },
  removeItem: async (key: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(sanitizedKey);
        logStorageOperation('WEB_REMOVE', sanitizedKey);
      } else {
        throw new Error('localStorage not available');
      }
    } catch (error) {
      logStorageOperation('WEB_REMOVE', key, null, error);
      throw error;
    }
  },
};

// Native storage using AsyncStorage for large data with enhanced error handling
const nativeStorage: StorageInterface = {
  getItem: async (key: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      const value = await AsyncStorage.getItem(sanitizedKey);
      logStorageOperation('ASYNC_GET', sanitizedKey, value);
      return value;
    } catch (error) {
      logStorageOperation('ASYNC_GET', key, null, error);
      throw error;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      const validatedValue = validateValue(value);
      await AsyncStorage.setItem(sanitizedKey, validatedValue);
      logStorageOperation('ASYNC_SET', sanitizedKey, validatedValue);
    } catch (error) {
      logStorageOperation('ASYNC_SET', key, value, error);
      throw error;
    }
  },
  removeItem: async (key: string) => {
    try {
      const sanitizedKey = sanitizeKey(key);
      await AsyncStorage.removeItem(sanitizedKey);
      logStorageOperation('ASYNC_REMOVE', sanitizedKey);
    } catch (error) {
      logStorageOperation('ASYNC_REMOVE', key, null, error);
      throw error;
    }
  },
};

// Download PDF for offline access
const downloadPDFForOfflineUse = async (pdfUrl: string, sessionId: string): Promise<string | null> => {
  try {
    if (!pdfUrl || typeof pdfUrl !== 'string') {
      console.warn('❌ Invalid PDF URL provided for download');
      return null;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      console.warn('❌ Invalid session ID provided for PDF download');
      return null;
    }

    if (Platform.OS === 'web') {
      // Web platform: store URL reference only
      return null;
    }

    const filename = `contract_${sessionId}_${Date.now()}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Check if already exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileUri;
    }

    console.log('📥 Downloading PDF for offline use:', pdfUrl);

    // Download the PDF
    const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);

    if (downloadResult.status === 200) {
      console.log('✅ PDF downloaded successfully:', downloadResult.uri);
      return downloadResult.uri;
    } else {
      console.warn('❌ PDF download failed with status:', downloadResult.status);
      return null;
    }
  } catch (error) {
    console.error('Failed to download PDF for offline use:', error);
    return null;
  }
};

// Enhanced storage selection with better error handling
const getStorage = (dataSize?: number): StorageInterface => {
  console.log(`📦 Selecting storage for data size: ${dataSize} bytes`);

  if (Platform.OS === 'web') {
    console.log('📦 Using web storage (localStorage)');
    return webStorage;
  }

  // Use AsyncStorage for large data or SecureStore for small sensitive data
  if (dataSize && dataSize > MAX_SECURE_STORE_SIZE) {
    console.log('📦 Using AsyncStorage (large data)');
    return nativeStorage;
  }

  console.log('📦 Using SecureStore with AsyncStorage fallback');
  return {
    getItem: async (key: string) => {
      try {
        const sanitizedKey = sanitizeKey(key);
        const value = await SecureStore.getItemAsync(sanitizedKey);
        logStorageOperation('SECURE_GET', sanitizedKey, value);
        return value;
      } catch (error) {
        logStorageOperation('SECURE_GET', key, null, error);
        console.warn('🔄 SecureStore getItem error, falling back to AsyncStorage:', error);
        // Fallback to AsyncStorage
        return await nativeStorage.getItem(key);
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        const sanitizedKey = sanitizeKey(key);
        const validatedValue = validateValue(value);
        await SecureStore.setItemAsync(sanitizedKey, validatedValue);
        logStorageOperation('SECURE_SET', sanitizedKey, validatedValue);
      } catch (error) {
        logStorageOperation('SECURE_SET', key, value, error);
        console.warn('🔄 SecureStore setItem error, falling back to AsyncStorage:', error);
        // Fallback to AsyncStorage
        await nativeStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      try {
        const sanitizedKey = sanitizeKey(key);
        await SecureStore.deleteItemAsync(sanitizedKey);
        logStorageOperation('SECURE_REMOVE', sanitizedKey);
      } catch (error) {
        logStorageOperation('SECURE_REMOVE', key, null, error);
        console.warn('🔄 SecureStore removeItem error, falling back to AsyncStorage:', error);
        // Fallback to AsyncStorage
        await nativeStorage.removeItem(key);
      }
    },
  };
};

// Enhanced store session data with validation and full persistence
export const storeSessionData = async (
  sessionData: SessionDetailsApiResponse
): Promise<void> => {
  try {
    console.log('📦 Starting storeSessionData for session:', sessionData?.session_id);

    if (!sessionData) {
      throw new Error('Session data is required');
    }

    if (!sessionData.session_id) {
      throw new Error('Session ID is required in session data');
    }

    const deviceId = await getOrCreateDeviceId();
    const dataString = JSON.stringify(sessionData);
    
    // Use nativeStorage for large session data to avoid size limits
    const storageInterface = dataString.length > MAX_SECURE_STORE_SIZE ? nativeStorage : getStorage(dataString.length);
    const storageKey = `session_${sessionData.session_id}`;

    await storageInterface.setItem(storageKey, dataString);

    // Store device-specific session mapping
    const deviceSessionsKey = `device_sessions_${deviceId}`;
    const existingSessions = await storageInterface.getItem(deviceSessionsKey);
    const sessionsList = existingSessions ? JSON.parse(existingSessions) : [];
    
    if (!sessionsList.includes(sessionData.session_id)) {
      sessionsList.unshift(sessionData.session_id);
      // Keep only last 50 sessions per device
      const trimmedSessions = sessionsList.slice(0, 50);
      await storageInterface.setItem(deviceSessionsKey, JSON.stringify(trimmedSessions));
    }

    // Update sessions index for quick lookup
    await updateSessionsIndex(sessionData.session_id);

    // Store as offline analysis for history screen
    await storeOfflineAnalysis(sessionData);

    // Store full restoration data
    const restorationData = {
      sessionId: sessionData.session_id,
      timestamp: new Date().toISOString(),
      deviceId: deviceId,
      analysisTermsCount: sessionData.analysis_results?.length || 0,
      compliancePercentage: sessionData.compliance_percentage || 0,
      originalFilename: sessionData.original_filename,
    };
    
    await storageInterface.setItem(`restoration_${sessionData.session_id}`, JSON.stringify(restorationData));

    console.log('✅ Session data stored successfully with full persistence');
  } catch (error) {
    console.error('❌ Failed to store session data:', error);
    throw error;
  }
};

// Enhanced store contract analysis for offline access
export const storeOfflineAnalysis = async (
  sessionData: SessionDetailsApiResponse,
  localPdfPath?: string
): Promise<void> => {
  try {
    console.log('📦 Starting storeOfflineAnalysis for session:', sessionData?.session_id);

    if (!sessionData) {
      throw new Error('Session data is required for offline analysis');
    }

    if (!sessionData.session_id) {
      throw new Error('Session ID is required in session data');
    }

    // Optionally download PDF for offline access
    let cachedPdfPath: string | undefined = localPdfPath;
    const cloudinaryUrl = sessionData.original_cloudinary_info?.url;

    // Try to download PDF for offline use if we don't have a local path and cloud URL exists
    if (!cachedPdfPath && typeof cloudinaryUrl === 'string') {
      try {
        const downloadedPath = await downloadPDFForOfflineUse(cloudinaryUrl, sessionData.session_id);
        if (downloadedPath) {
          cachedPdfPath = downloadedPath;
          console.log('📄 PDF cached locally:', cachedPdfPath);
        }
      } catch (pdfError) {
        console.warn('⚠️ Failed to cache PDF offline:', pdfError);
        // Continue without local PDF cache
      }
    }

    // If no local path, use cloud URL as fallback
    if (!cachedPdfPath && cloudinaryUrl) {
      console.warn('⚠️ No local PDF cached, using cloud URL:', cloudinaryUrl);
      cachedPdfPath = cloudinaryUrl; // Use cloud URL if no local cache
    }

    // If still no path available, log warning and skip storage
    if (!cachedPdfPath) {
      console.warn('❌ No PDF path available for offline analysis, skipping storage');
      return;
    }

    // Create offline analysis summary
    const analysis: OfflineContractAnalysis = {
      id: `offline_${sessionData.session_id}`,
      sessionId: sessionData.session_id,
      pdfUrl: sessionData.original_cloudinary_info?.url,
      localPdfPath: cachedPdfPath,
      originalFilename: sessionData.original_filename || 'Unknown Contract',
      summary: generateAnalysisSummary(sessionData),
      complianceScore: calculateComplianceScore(sessionData),
      flags: generateFlags(sessionData),
      analysisDate: sessionData.analysis_timestamp || new Date().toISOString(),
      termsCount: sessionData.analysis_results?.length || 0,
      issuesCount: sessionData.analysis_results?.filter(term => !term.is_valid_sharia).length || 0,
      language: sessionData.detected_contract_language || 'en',
      fullSessionData: sessionData,
      isOfflineOnly: false,
    };

    const storage = nativeStorage; // Always use AsyncStorage for analysis history
    const storageKey = `offline_analysis_${sessionData.session_id}`;

    await storage.setItem(storageKey, JSON.stringify(analysis));
    console.log('✅ Offline analysis stored successfully');

    // Update offline analyses index
    await updateOfflineAnalysesIndex(sessionData.session_id);

  } catch (error) {
    console.error('❌ Failed to store offline analysis:', error);
    throw error;
  }
};

// Calculate compliance score from analysis results
const calculateComplianceScore = (sessionData: SessionDetailsApiResponse): number => {
  // If API already provides compliance_percentage, use it
  if (typeof sessionData.compliance_percentage === 'number') {
    return sessionData.compliance_percentage;
  }

  // Otherwise, calculate from analysis_results
  const results = sessionData.analysis_results || [];
  if (results.length === 0) {
    return 0;
  }

  const compliantCount = results.filter(term => {
    // Calculate compliance using actual API properties
    return term.expert_override_is_valid_sharia ?? 
           (term.is_confirmed_by_user ? true : term.is_valid_sharia) ?? 
           false;
  }).length;

  return Math.round((compliantCount / results.length) * 100);
};

// Generate analysis summary
const generateAnalysisSummary = (sessionData: SessionDetailsApiResponse): string => {
  if (!sessionData) {
    return 'No analysis data available';
  }

  const results = sessionData.analysis_results || [];
  const issuesCount = results.filter(term => !term.is_valid_sharia).length;
  const complianceScore = calculateComplianceScore(sessionData);

  if (issuesCount === 0) {
    return `Contract is Sharia compliant (${complianceScore}% compliance). No issues found.`;
  } else {
    const plural = issuesCount > 1 ? 'issues' : 'issue';
    return `Found ${issuesCount} Sharia ${plural} (${complianceScore}% compliance). Review required.`;
  }
};

// Generate flags for analysis
const generateFlags = (sessionData: SessionDetailsApiResponse): string[] => {
  if (!sessionData) {
    return ['No Data'];
  }

  const flags: string[] = [];
  const results = sessionData.analysis_results || [];
  const issuesCount = results.filter(term => !term.is_valid_sharia).length;
  const complianceScore = calculateComplianceScore(sessionData);

  if (complianceScore < 70) {
    flags.push('Low Compliance');
  }

  if (issuesCount > 0) {
    flags.push('Needs Review');
  }

  if (results.some(term => term.has_expert_feedback)) {
    flags.push('Expert Reviewed');
  }

  if (complianceScore >= 90) {
    flags.push('Highly Compliant');
  }

  return flags;
};

// Enhanced update offline analyses index with validation
const updateOfflineAnalysesIndex = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid session ID is required for updating offline analyses index');
    }

    console.log('📚 Updating offline analyses index for session:', sessionId);

    const storage = nativeStorage;
    const indexData = await storage.getItem('offline_analyses_index');
    const sessionIds: string[] = indexData ? JSON.parse(indexData) : [];

    // Add new session ID if not exists
    if (!sessionIds.includes(sessionId)) {
      sessionIds.unshift(sessionId); // Add to beginning for recency

      // Keep only last 50 analyses to prevent storage bloat
      const trimmedIds = sessionIds.slice(0, 50);

      await storage.setItem('offline_analyses_index', JSON.stringify(trimmedIds));
      console.log('📚 Offline analyses index updated successfully');
    } else {
      console.log('📚 Session already exists in offline analyses index');
    }
  } catch (error) {
    console.error('❌ Failed to update offline analyses index:', error);
  }
};

// Enhanced get all offline analyses for history screen
export const getOfflineAnalyses = async (): Promise<OfflineContractAnalysis[]> => {
  try {
    console.log('📚 Loading offline analyses...');
    const storage = nativeStorage;
    const indexData = await storage.getItem('offline_analyses_index');

    if (!indexData) {
      console.log('📚 No offline analyses index found');
      return [];
    }

    const sessionIds: string[] = JSON.parse(indexData);
    console.log('📚 Found session IDs in index:', sessionIds.length);

    const analyses: OfflineContractAnalysis[] = [];
    const failedLoads: string[] = [];

    // Retrieve each analysis with error recovery
    for (const sessionId of sessionIds) {
      if (!sessionId || typeof sessionId !== 'string') {
        console.warn('📚 Invalid session ID in index:', sessionId);
        failedLoads.push(sessionId);
        continue;
      }

      try {
        const dataString = await storage.getItem(`offline_analysis_${sessionId}`);
        if (dataString) {
          const analysis: OfflineContractAnalysis = JSON.parse(dataString);

          // Validate analysis data
          if (analysis.sessionId && analysis.originalFilename) {
            analyses.push(analysis);
          } else {
            console.warn('📚 Invalid analysis data for session:', sessionId);
            failedLoads.push(sessionId);
          }
        } else {
          console.warn('📚 No data found for session:', sessionId);
          failedLoads.push(sessionId);
        }
      } catch (error) {
        console.warn(`📚 Failed to load offline analysis ${sessionId}:`, error);
        failedLoads.push(sessionId);
      }
    }

    // Clean up failed loads from index
    if (failedLoads.length > 0) {
      const cleanSessionIds = sessionIds.filter(id => !failedLoads.includes(id));
      await storage.setItem('offline_analyses_index', JSON.stringify(cleanSessionIds));
      console.log('🧹 Cleaned up failed loads from index');
    }

    // Sort by analysis date (newest first)
    const sortedAnalyses = analyses.sort((a, b) => {
      const dateA = new Date(a.analysisDate).getTime();
      const dateB = new Date(b.analysisDate).getTime();
      return dateB - dateA;
    });

    console.log('✅ Successfully loaded offline analyses:', sortedAnalyses.length);
    return sortedAnalyses;

  } catch (error) {
    console.error('❌ Failed to get offline analyses:', error);
    return [];
  }
};

// Enhanced update sessions index with validation
const updateSessionsIndex = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid session ID is required for updating sessions index');
    }

    console.log('📚 Updating sessions index for session:', sessionId);

    const storage = getStorage();
    const indexData = await storage.getItem('sessions_index');
    const sessionIds: string[] = indexData ? JSON.parse(indexData) : [];

    // Add new session ID if not exists
    if (!sessionIds.includes(sessionId)) {
      sessionIds.unshift(sessionId); // Add to beginning for recency

      // Keep only last 100 sessions to prevent storage bloat
      const trimmedIds = sessionIds.slice(0, 100);

      await storage.setItem('sessions_index', JSON.stringify(trimmedIds));
      console.log('📚 Sessions index updated successfully');
    } else {
      console.log('📚 Session already exists in sessions index');
    }
  } catch (error) {
    console.error('❌ Failed to update sessions index:', error);
  }
};

// Enhanced retrieve session data with validation
export const getSessionData = async (
  sessionId: string
): Promise<SessionDetailsApiResponse | null> => {
  try {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid session ID is required');
    }

    console.log('📚 Retrieving session data for:', sessionId);

    const storageKey = `session_${sessionId}`;
    
    // Try both storage methods due to size constraints
    let dataString = null;
    
    // Try nativeStorage first (for large data)
    try {
      dataString = await nativeStorage.getItem(storageKey);
    } catch (error) {
      console.warn('⚠️ nativeStorage failed, trying getStorage():', error);
    }
    
    // Fallback to getStorage if nativeStorage fails
    if (!dataString) {
      try {
        const storage = getStorage();
        dataString = await storage.getItem(storageKey);
      } catch (error) {
        console.warn('⚠️ getStorage also failed:', error);
      }
    }

    if (dataString) {
      const sessionData = JSON.parse(dataString);
      console.log('✅ Session data retrieved successfully');
      return sessionData;
    }

    console.log('📚 No session data found for:', sessionId);
    return null;
  } catch (error) {
    console.error('❌ Failed to retrieve session data:', error);
    return null;
  }
};

// Enhanced get all stored sessions with validation
export const getAllStoredSessions = async (): Promise<SessionDetailsApiResponse[]> => {
  try {
    console.log('📚 Loading all stored sessions...');
    const storage = getStorage();
    const indexData = await storage.getItem('sessions_index');

    if (!indexData) {
      console.log('📚 No sessions index found');
      return [];
    }

    const sessionIds: string[] = JSON.parse(indexData);
    console.log('📚 Found session IDs in index:', sessionIds.length);
    const sessions: SessionDetailsApiResponse[] = [];

    // Retrieve each session data
    for (const sessionId of sessionIds) {
      if (!sessionId || typeof sessionId !== 'string') {
        console.warn('📚 Invalid session ID in index:', sessionId);
        continue;
      }

      try {
        const sessionData = await getSessionData(sessionId);
        if (sessionData) {
          sessions.push(sessionData);
        }
      } catch (error) {
        console.warn(`📚 Failed to load session ${sessionId}:`, error);
      }
    }

    console.log('✅ Successfully loaded stored sessions:', sessions.length);
    return sessions;
  } catch (error) {
    console.error('❌ Failed to get all stored sessions:', error);
    return [];
  }
};

// Enhanced remove session data with validation
export const removeSessionData = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid session ID is required for removal');
    }

    console.log('🗑️ Removing session data for:', sessionId);

    const storage = getStorage();

    // Remove session data
    await storage.removeItem(`session_${sessionId}`);

    // Remove offline analysis
    await nativeStorage.removeItem(`offline_analysis_${sessionId}`);

    // Update sessions index
    const indexData = await storage.getItem('sessions_index');
    if (indexData) {
      const sessionIds: string[] = JSON.parse(indexData);
      const updatedIds = sessionIds.filter(id => id !== sessionId);
      await storage.setItem('sessions_index', JSON.stringify(updatedIds));
    }

    // Update offline analyses index
    const offlineIndexData = await nativeStorage.getItem('offline_analyses_index');
    if (offlineIndexData) {
      const offlineSessionIds: string[] = JSON.parse(offlineIndexData);
      const updatedOfflineIds = offlineSessionIds.filter(id => id !== sessionId);
      await nativeStorage.setItem('offline_analyses_index', JSON.stringify(updatedOfflineIds));
    }

    console.log('✅ Session data removed successfully');
  } catch (error) {
    console.error('❌ Failed to remove session data:', error);
    throw error;
  }
};

// Enhanced clear all stored sessions with validation
export const clearAllStoredSessions = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing all stored sessions...');

    const storage = getStorage();
    const indexData = await storage.getItem('sessions_index');

    if (indexData) {
      const sessionIds: string[] = JSON.parse(indexData);
      console.log('🗑️ Found sessions to clear:', sessionIds.length);

      // Remove all session data
      for (const sessionId of sessionIds) {
        if (sessionId && typeof sessionId === 'string') {
          try {
            await storage.removeItem(`session_${sessionId}`);
            await nativeStorage.removeItem(`offline_analysis_${sessionId}`);
          } catch (error) {
            console.warn(`🗑️ Failed to remove session ${sessionId}:`, error);
          }
        }
      }

      // Clear sessions index
      await storage.removeItem('sessions_index');
      await nativeStorage.removeItem('offline_analyses_index');

      console.log('✅ All sessions cleared successfully');
    } else {
      console.log('🗑️ No sessions found to clear');
    }

  } catch (error) {
    console.error('❌ Failed to clear all stored sessions:', error);
    throw error;
  }
};

// Dedicated storage key validator utility
export const validateStorageKey = (key: any, operation: string = 'storage operation'): string => {
  console.log(`🔍 Validating storage key for ${operation}:`, { key, type: typeof key });

  if (key === null) {
    const error = new Error(`Storage key cannot be null for ${operation}`);
    console.error('🔴 Storage key validation failed:', error.message);
    throw error;
  }

  if (key === undefined) {
    const error = new Error(`Storage key cannot be undefined for ${operation}`);
    console.error('🔴 Storage key validation failed:', error.message);
    throw error;
  }

  if (typeof key !== 'string') {
    const error = new Error(`Storage key must be a string for ${operation}, received: ${typeof key}`);
    console.error('🔴 Storage key validation failed:', error.message);
    throw error;
  }

  if (key.trim().length === 0) {
    const error = new Error(`Storage key cannot be empty for ${operation}`);
    console.error('🔴 Storage key validation failed:', error.message);
    throw error;
  }

  // Additional validation for known storage keys
  const validKeys = Object.values(storageKeys);
  if (!validKeys.includes(key) && !key.startsWith('session_') && !key.startsWith('offline_analysis_')) {
    console.warn(`⚠️ Using non-standard storage key: "${key}" for ${operation}`);
  }

  console.log(`✅ Storage key validation passed for ${operation}:`, key);
  return key;
};

// Enhanced export storage interface with validation
export const storage = {
  getItemAsync: async (key: string, defaultValue?: string | null) => {
    try {
      const validatedKey = validateStorageKey(key, 'getItemAsync');
      const storageInterface = getStorage();
      const result = await storageInterface.getItem(validatedKey);

      if (result === null && defaultValue !== undefined) {
        console.log(`📦 No stored value found for "${validatedKey}", returning default:`, defaultValue);
        return defaultValue;
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Storage getItemAsync failed for key "${key}":`, errorMessage);

      // Return default value instead of throwing for missing keys
      if (defaultValue !== undefined) {
        console.log(`🔄 Returning default value due to error:`, defaultValue);
        return defaultValue;
      }

      return null; // Return null instead of throwing to prevent crashes
    }
  },

  setItemAsync: async (key: string, value: string) => {
    try {
      const validatedKey = validateStorageKey(key, 'setItemAsync');
      const validatedValue = validateValue(value);
      const storageInterface = getStorage(validatedValue.length);
      return await storageInterface.setItem(validatedKey, validatedValue);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Storage setItemAsync failed for key "${key}":`, errorMessage);
      throw error; // Still throw for set operations as they indicate real problems
    }
  },

  deleteItemAsync: async (key: string) => {
    try {
      const validatedKey = validateStorageKey(key, 'deleteItemAsync');
      const storageInterface = getStorage();
      return await storageInterface.removeItem(validatedKey);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Storage deleteItemAsync failed for key "${key}":`, errorMessage);
      // Don't throw for delete operations - if key doesn't exist, that's fine
      console.log(`🔄 Ignoring delete error for key "${key}" - may not exist`);
    }
  },

  // Handle large data by chunking it
  async setLargeItem(key: string, value: any): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const chunks = [];
      const chunkSize = 2000; // Safe chunk size for SecureStore

      // Split into chunks
      for (let i = 0; i < stringValue.length; i += chunkSize) {
        chunks.push(stringValue.substring(i, i + chunkSize));
      }

      // Store chunk count first
      await this.setItemAsync(`${key}_chunks`, chunks.length.toString());

      // Store each chunk
      for (let i = 0; i < chunks.length; i++) {
        await this.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }

      console.log(`✅ Large data stored in ${chunks.length} chunks for key: ${key}`);
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to store large data for key: ${key}`, error);
      return false;
    }
  },

  async getLargeItem(key: string): Promise<any> {
    try {
      const chunkCountStr = await this.getItemAsync(`${key}_chunks`);
      if (!chunkCountStr) return null;

      const chunkCount = parseInt(chunkCountStr);
      const chunks = [];

      // Retrieve all chunks
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await this.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) {
          console.warn(`⚠️ Missing chunk ${i} for key: ${key}`);
          return null;
        }
        chunks.push(chunk);
      }

      const reconstructed = chunks.join('');
      try {
        return JSON.parse(reconstructed);
      } catch {
        return reconstructed;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to retrieve large data for key: ${key}`, error);
      return null;
    }
  },
};

export const storageKeys = {
  // Device related keys
  DEVICE_ID: 'device_id',

  // Auth related keys
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',

  // Theme related keys
  THEME: 'theme_preference',

  // Language related keys
  LANGUAGE: 'language_preference',
  SHARIAA_LANGUAGE: 'shariaa_language',

  // User and role related keys
  USER_ROLE: 'user_role',

  // Session related keys
  SHARIAA_SESSIONS: 'shariaa_sessions',
  SESSION_INTERACTIONS: 'session_interactions',
  CURRENT_SESSION_ID: 'current_session_id',
  CURRENT_ANALYSIS_TERMS: 'current_analysis_terms',
  CURRENT_SESSION_DETAILS: 'current_session_details',

  // Contract related keys
  CONTRACT_HISTORY: 'contract_history',
  OFFLINE_ANALYSES: 'offline_analyses_index',
  SESSIONS_INDEX: 'sessions_index',
};

// Storage validation utility for debugging
export const validateAllStorageKeys = () => {
  console.log('🔍 Validating all storage keys...');

  const keys = Object.entries(storageKeys);
  let validKeys = 0;
  let invalidKeys = 0;

  keys.forEach(([keyName, keyValue]) => {
    try {
      validateStorageKey(keyValue, `storageKeys.${keyName}`);
      validKeys++;
} catch (error) {
  if (error instanceof Error) {
    console.error(`❌ Invalid storage key ${keyName}:`, error.message);
  } else {
    console.error(`❌ Invalid storage key ${keyName}:`, error);
  }
  invalidKeys++;
}
  console.log(`✅ Storage key "${keyName}" is valid: "${keyValue}"`);
  logStorageOperation('VALIDATE', keyValue, null);
  });

  console.log(`✅ Storage key validation complete: ${validKeys} valid, ${invalidKeys} invalid`);
  return { validKeys, invalidKeys, totalKeys: keys.length };
};

// Utility to test storage operations
export const testStorageOperations = async () => {
  console.log('🧪 Testing storage operations...');

  try {
    const testKey = 'test_storage_key';
    const testValue = 'test_storage_value';

    // Test set
    await storage.setItemAsync(testKey, testValue);
    console.log('✅ Storage setItemAsync test passed');

    // Test get
    const retrieved = await storage.getItemAsync(testKey);
    if (retrieved === testValue) {
      console.log('✅ Storage getItemAsync test passed');
    } else {
      console.error('❌ Storage getItemAsync test failed: value mismatch');
    }

    // Test delete
    await storage.deleteItemAsync(testKey);
    console.log('✅ Storage deleteItemAsync test passed');

    // Test get with default
    const defaultTest = await storage.getItemAsync('non_existent_key', 'default_value');
    if (defaultTest === 'default_value') {
      console.log('✅ Storage getItemAsync with default test passed');
    } else {
      console.error('❌ Storage getItemAsync with default test failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Storage operations test failed:', error);
    return false;
  }
};

// Enhanced device ID management with better persistence
export const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    console.log('🔑 Getting or creating device ID...');

    // First try to get existing device ID
    let deviceId = await storage.getItemAsync(storageKeys.DEVICE_ID);

    if (deviceId && typeof deviceId === 'string' && deviceId.length > 0) {
      console.log('✅ Found existing device ID:', deviceId.substring(0, 8) + '...');
      return deviceId;
    }

    // Generate new device ID if none exists
    const timestamp = Date.now().toString();
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const randomString = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    deviceId = `device_${timestamp}_${randomString}`;

    // Store the new device ID securely with backup storage
    await storage.setItemAsync(storageKeys.DEVICE_ID, deviceId);
    
    // Also store in secondary location for redundancy
    try {
      await nativeStorage.setItem(`backup_${storageKeys.DEVICE_ID}`, deviceId);
    } catch (backupError) {
      console.warn('⚠️ Failed to store backup device ID:', backupError);
    }

    console.log('✅ Generated new device ID:', deviceId.substring(0, 8) + '...');
    return deviceId;
  } catch (error) {
    console.error('❌ Failed to get/create device ID:', error);

    // Try backup storage first
    try {
      const backupDeviceId = await nativeStorage.getItem(`backup_${storageKeys.DEVICE_ID}`);
      if (backupDeviceId) {
        console.log('🔄 Retrieved device ID from backup storage');
        return backupDeviceId;
      }
    } catch (backupError) {
      console.warn('⚠️ Backup storage also failed:', backupError);
    }

    // Fallback to timestamp-based ID
    const fallbackId = `device_fallback_${Date.now()}`;
    try {
      await storage.setItemAsync(storageKeys.DEVICE_ID, fallbackId);
    } catch (storageError) {
      console.error('❌ Failed to store fallback device ID:', storageError);
    }

    return fallbackId;
  }
};

// Enhanced session sync functions
export const syncSessionsWithBackend = async (apiBaseUrl: string): Promise<boolean> => {
  try {
    console.log('🔄 Starting session sync with backend...');

    const deviceId = await getOrCreateDeviceId();
    const authToken = await storage.getItemAsync(storageKeys.AUTH_TOKEN);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Fetch remote sessions
    const response = await fetch(`${apiBaseUrl}/sessions?device_id=${deviceId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const remoteSessions: SessionDetailsApiResponse[] = await response.json();
    console.log(`📥 Fetched ${remoteSessions.length} sessions from backend`);

    // Get local sessions
    const localSessions = await getAllStoredSessions();
    console.log(`📱 Found ${localSessions.length} local sessions`);

    // Merge sessions (prioritize local, add missing remote)
    const mergedSessions = [...localSessions];

    for (const remoteSession of remoteSessions) {
      const existsLocally = localSessions.some(
        local => local.session_id === remoteSession.session_id
      );

      if (!existsLocally) {
        mergedSessions.push(remoteSession);
        await storeSessionData(remoteSession);
        console.log(`📥 Added remote session: ${remoteSession.session_id}`);
      }
    }

    // Upload local sessions that don't exist remotely
    for (const localSession of localSessions) {
      const existsRemotely = remoteSessions.some(
        remote => remote.session_id === localSession.session_id
      );

      if (!existsRemotely) {
        try {
          await uploadSessionToBackend(localSession, apiBaseUrl, deviceId);
          console.log(`📤 Uploaded local session: ${localSession.session_id}`);
        } catch (uploadError) {
          console.warn(`⚠️ Failed to upload session ${localSession.session_id}:`, uploadError);
        }
      }
    }

    console.log('✅ Session sync completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Session sync failed:', error);
    return false;
  }
};

export const uploadSessionToBackend = async (
  session: SessionDetailsApiResponse,
  apiBaseUrl: string,
  deviceId?: string
): Promise<boolean> => {
  try {
    const finalDeviceId = deviceId || await getOrCreateDeviceId();
    const authToken = await storage.getItemAsync(storageKeys.AUTH_TOKEN);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-ID': finalDeviceId,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBaseUrl}/save-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        device_id: finalDeviceId,
        session: session,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`✅ Session uploaded: ${session.session_id}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to upload session:', error);
    return false;
  }
};

// Network connectivity check
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 ثواني timeout

  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal,
    });

    return response.ok;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeoutId); // دايمًا ننضف الـ timeout
  }
};


// Enhanced offline-first session management
export const getSessionsOfflineFirst = async (apiBaseUrl?: string): Promise<SessionDetailsApiResponse[]> => {
  try {
    console.log('📱 Getting sessions (offline-first approach)...');

    // Always start with local sessions
    const localSessions = await getAllStoredSessions();
    console.log(`📱 Found ${localSessions.length} local sessions`);

    // Try to sync with backend if online and API URL provided
    if (apiBaseUrl) {
      const isOnline = await checkNetworkConnectivity();

      if (isOnline) {
        console.log('🌐 Device is online, attempting sync...');
        const syncSuccess = await syncSessionsWithBackend(apiBaseUrl);

        if (syncSuccess) {
          // Return updated local sessions after sync
          return await getAllStoredSessions();
        }
      } else {
        console.log('📱 Device is offline, using local sessions only');
      }
    }

    // Return local sessions
    return localSessions;

  } catch (error) {
    console.error('❌ Error in offline-first session retrieval:', error);
    // Always fallback to local sessions
    return await getAllStoredSessions();
  }
};

// Default export for backward compatibility
export default {
  storage,
  storageKeys,
  validateStorageKey,
  validateAllStorageKeys,
  testStorageOperations,
  storeSessionData,
  storeOfflineAnalysis,
  getOfflineAnalyses,
  getSessionData,
  getAllStoredSessions,
  removeSessionData,
  clearAllStoredSessions,
  getOrCreateDeviceId,
  syncSessionsWithBackend,
  uploadSessionToBackend,
  checkNetworkConnectivity,
  getSessionsOfflineFirst,
};