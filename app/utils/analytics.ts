import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AnalyticsData {
  analysesThisMonth: number;
  avgCompliance: number;
  recentCount: number;
  totalAnalyses: number;
  topCompliantSessions: SessionData[];
  monthlyTrend: MonthlyTrend[];
  performanceMetrics: PerformanceMetrics;
  // Enhanced analytics features
  complianceDistribution: ComplianceDistribution;
  contractTypes: ContractTypeAnalysis[];
  mostCommonIssues: IssueAnalysis[];
  timeBasedPatterns: TimePattern[];
  qualityMetrics: QualityMetrics;
  storageAnalysis: StorageAnalysis;
  userBehaviorInsights: UserBehaviorInsights;
}

interface SessionData {
  session_id: string;
  analysis_results: any[];
  createdAt: string;
  compliance: number;
  original_filename?: string;
}

interface MonthlyTrend {
  month: string;
  analyses: number;
  avgCompliance: number;
}

interface PerformanceMetrics {
  avgProcessingTime: number;
  successRate: number;
  errorCount: number;
}

interface ComplianceDistribution {
  excellent: number; // 90-100%
  good: number; // 70-89%
  moderate: number; // 50-69%
  poor: number; // 0-49%
}

interface ContractTypeAnalysis {
  language: 'ar' | 'en';
  count: number;
  avgCompliance: number;
  avgTermsCount: number;
}

interface IssueAnalysis {
  type: string;
  frequency: number;
  severity: 'high' | 'medium' | 'low';
  avgImpact: number;
}

interface TimePattern {
  hour: number;
  dayOfWeek: number;
  analysisCount: number;
  avgCompliance: number;
}

interface QualityMetrics {
  avgTermsPerContract: number;
  avgIssuesPerContract: number;
  contractsWithExpertReview: number;
  contractsWithHighCompliance: number;
}

interface StorageAnalysis {
  totalContracts: number;
  storageKeys: string[];
  dataIntegrity: number; // percentage
  totalStorageSize: number; // in bytes
  lastScanTime: string;
}

interface UserBehaviorInsights {
  mostActiveDay: string;
  mostActiveHour: number;
  analysisFrequency: number; // per week
  avgTimeBetweenAnalyses: number; // in hours
  retentionRate: number; // percentage of users returning
}

// Enhanced storage interface with error handling and retry logic
const storage = Platform.OS === 'web' ? 
  {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`📦 localStorage.getItem failed for key "${key}":`, error);
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`📦 localStorage.setItem failed for key "${key}":`, error);
        throw error;
      }
    },
  } : 
  {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.warn(`📦 AsyncStorage.getItem failed for key "${key}":`, error);
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.warn(`📦 AsyncStorage.setItem failed for key "${key}":`, error);
        throw error;
      }
    },
  };

// Batch storage operations for better performance
const batchGetItems = async (keys: string[]): Promise<{ [key: string]: string | null }> => {
  const results: { [key: string]: string | null } = {};
  
  if (Platform.OS === 'web') {
    // Web: process all keys synchronously
    for (const key of keys) {
      results[key] = await storage.getItem(key);
    }
  } else {
    // React Native: use AsyncStorage.multiGet for better performance
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      for (const [key, value] of keyValuePairs) {
        results[key] = value;
      }
    } catch (error) {
      console.warn('📦 AsyncStorage.multiGet failed, falling back to individual gets:', error);
      // Fallback to individual gets
      for (const key of keys) {
        results[key] = await storage.getItem(key);
      }
    }
  }
  
  return results;
};

// 🔍 Load contract data from multiple possible storage sources
async function loadContractFromMultipleSources(sessionId: string): Promise<SessionData | null> {
  const possibleKeys = [
    `session_${sessionId}`,
    `offline_analysis_${sessionId}`,
    `analysis_${sessionId}`,
    `restoration_${sessionId}`
  ];

  for (const key of possibleKeys) {
    try {
      const data = await storage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        const contractData = await parseAndValidateContractData(parsed, sessionId);
        if (contractData) return contractData;
      }
    } catch (e) {
      console.warn(`Failed to load from ${key}:`, e);
    }
  }

  return null;
}

// 🔍 Parse and validate contract data from storage
async function parseAndValidateContractData(data: any, sessionId: string): Promise<SessionData | null> {
  try {
    if (!data) return null;

    // Handle different data structures
    const analysisResults = data.analysis_results || data.results || data.terms || [];
    const compliance = data.compliance_percentage || data.compliance || data.overallCompliance || 0;
    const createdAt = data.createdAt || data.created_at || data.timestamp || data.analysisDate || new Date().toISOString();
    const filename = data.original_filename || data.filename || data.title || 'Unknown Contract';

    // Validate essential data
    if (!sessionId || !Array.isArray(analysisResults)) {
      return null;
    }

    return {
      session_id: sessionId,
      analysis_results: analysisResults,
      createdAt: validateAndFormatDate(createdAt),
      compliance: validateCompliance(compliance),
      original_filename: filename,
    };
  } catch (error) {
    console.warn(`Failed to parse contract data for session ${sessionId}:`, error);
    return null;
  }
}

// 🧮 Compute comprehensive analytics with all enhanced features
async function computeComprehensiveAnalytics(
  sessions: SessionData[], 
  currentDate: Date, 
  currentMonth: number, 
  currentYear: number,
  activeProcessingJobs: string[] = []
): Promise<AnalyticsData> {
  console.log('🧮 Computing comprehensive analytics...');

  // Basic analytics (existing functionality)
  const basicAnalytics = computeAnalytics(sessions, currentDate, currentMonth, currentYear);

  // Enhanced analytics computations
  const complianceDistribution = computeComplianceDistribution(sessions);
  const contractTypes = computeContractTypeAnalysis(sessions);
  const mostCommonIssues = computeIssueAnalysis(sessions);
  const timeBasedPatterns = computeTimePatterns(sessions);
  const qualityMetrics = computeQualityMetrics(sessions);
  const storageAnalysis = await computeStorageAnalysis(sessions);
  const userBehaviorInsights = computeUserBehaviorInsights(sessions);

  return {
    ...basicAnalytics,
    complianceDistribution,
    contractTypes,
    mostCommonIssues,
    timeBasedPatterns,
    qualityMetrics,
    storageAnalysis,
    userBehaviorInsights,
  };
}

// 📊 Compute compliance distribution
function computeComplianceDistribution(sessions: SessionData[]): ComplianceDistribution {
  const distribution = { excellent: 0, good: 0, moderate: 0, poor: 0 };
  
  sessions.forEach(session => {
    if (session.compliance >= 90) distribution.excellent++;
    else if (session.compliance >= 70) distribution.good++;
    else if (session.compliance >= 50) distribution.moderate++;
    else distribution.poor++;
  });

  return distribution;
}

// 📊 Compute contract type analysis
function computeContractTypeAnalysis(sessions: SessionData[]): ContractTypeAnalysis[] {
  const typeGroups = new Map<string, SessionData[]>();
  
  sessions.forEach(session => {
    // Determine language from filename or content
    const language = session.original_filename?.includes('ar') || 
                    session.analysis_results.some(r => r.arabic_text) ? 'ar' : 'en';
    
    if (!typeGroups.has(language)) {
      typeGroups.set(language, []);
    }
    typeGroups.get(language)!.push(session);
  });

  return Array.from(typeGroups.entries()).map(([language, langSessions]) => {
    const avgCompliance = langSessions.length > 0 
      ? Math.round(langSessions.reduce((sum, s) => sum + s.compliance, 0) / langSessions.length)
      : 0;
    
    const avgTermsCount = langSessions.length > 0
      ? Math.round(langSessions.reduce((sum, s) => sum + s.analysis_results.length, 0) / langSessions.length)
      : 0;

    return {
      language: language as 'ar' | 'en',
      count: langSessions.length,
      avgCompliance,
      avgTermsCount,
    };
  });
}

// 📊 Compute issue analysis
function computeIssueAnalysis(sessions: SessionData[]): IssueAnalysis[] {
  const issueMap = new Map<string, { count: number; impacts: number[] }>();
  
  sessions.forEach(session => {
    session.analysis_results.forEach(result => {
      if (result.is_valid_sharia === false) {
        const issueType = result.issue_type || result.category || 'Unknown Issue';
        const impact = 100 - session.compliance; // Higher non-compliance = higher impact
        
        if (!issueMap.has(issueType)) {
          issueMap.set(issueType, { count: 0, impacts: [] });
        }
        
        const issueData = issueMap.get(issueType)!;
        issueData.count++;
        issueData.impacts.push(impact);
      }
    });
  });

  return Array.from(issueMap.entries())
    .map(([type, data]) => {
      const avgImpact = data.impacts.reduce((sum, i) => sum + i, 0) / data.impacts.length;
      const severity: 'high' | 'medium' | 'low' = avgImpact > 50 ? 'high' : avgImpact > 25 ? 'medium' : 'low';
      
      return {
        type,
        frequency: data.count,
        severity,
        avgImpact: Math.round(avgImpact),
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10); // Top 10 issues
}

// 📊 Compute time-based patterns
function computeTimePatterns(sessions: SessionData[]): TimePattern[] {
  const patterns = new Map<string, { count: number; compliances: number[] }>();
  
  sessions.forEach(session => {
    const date = new Date(session.createdAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const key = `${dayOfWeek}-${hour}`;
    
    if (!patterns.has(key)) {
      patterns.set(key, { count: 0, compliances: [] });
    }
    
    const pattern = patterns.get(key)!;
    pattern.count++;
    pattern.compliances.push(session.compliance);
  });

  return Array.from(patterns.entries())
    .map(([key, data]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return {
        hour,
        dayOfWeek,
        analysisCount: data.count,
        avgCompliance: Math.round(data.compliances.reduce((sum, c) => sum + c, 0) / data.compliances.length),
      };
    })
    .sort((a, b) => b.analysisCount - a.analysisCount);
}

// 📊 Compute quality metrics
function computeQualityMetrics(sessions: SessionData[]): QualityMetrics {
  const validSessions = sessions.filter(s => s.analysis_results.length > 0);
  
  const avgTermsPerContract = validSessions.length > 0
    ? Math.round(validSessions.reduce((sum, s) => sum + s.analysis_results.length, 0) / validSessions.length)
    : 0;
  
  const avgIssuesPerContract = validSessions.length > 0
    ? Math.round(validSessions.reduce((sum, s) => sum + s.analysis_results.filter(r => !r.is_valid_sharia).length, 0) / validSessions.length)
    : 0;
  
  const contractsWithExpertReview = sessions.filter(s => 
    s.analysis_results.some(r => r.has_expert_feedback)
  ).length;
  
  const contractsWithHighCompliance = sessions.filter(s => s.compliance >= 90).length;

  return {
    avgTermsPerContract,
    avgIssuesPerContract,
    contractsWithExpertReview,
    contractsWithHighCompliance,
  };
}

// 📊 Compute storage analysis
async function computeStorageAnalysis(sessions: SessionData[]): Promise<StorageAnalysis> {
  const storageKeys: string[] = [];
  let totalSize = 0;
  let validContracts = 0;

  // Estimate storage usage
  for (const session of sessions) {
    try {
      const sessionData = JSON.stringify(session);
      totalSize += sessionData.length;
      validContracts++;
      storageKeys.push(`session_${session.session_id}`);
    } catch (e) {
      console.warn(`Failed to estimate size for session ${session.session_id}`);
    }
  }

  const dataIntegrity = sessions.length > 0 ? Math.round((validContracts / sessions.length) * 100) : 100;

  return {
    totalContracts: sessions.length,
    storageKeys,
    dataIntegrity,
    totalStorageSize: totalSize,
    lastScanTime: new Date().toISOString(),
  };
}

// 📊 Compute user behavior insights
function computeUserBehaviorInsights(sessions: SessionData[]): UserBehaviorInsights {
  if (sessions.length === 0) {
    return {
      mostActiveDay: 'No data',
      mostActiveHour: 0,
      analysisFrequency: 0,
      avgTimeBetweenAnalyses: 0,
      retentionRate: 0,
    };
  }

  // Most active day
  const dayCount = new Map<number, number>();
  const hourCount = new Map<number, number>();
  
  sessions.forEach(session => {
    const date = new Date(session.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    
    dayCount.set(day, (dayCount.get(day) || 0) + 1);
    hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
  });

  const mostActiveDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0
  ];

  const mostActiveHour = Array.from(hourCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  // Calculate time between analyses
  const sortedSessions = sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let totalTimeBetween = 0;
  let intervals = 0;

  for (let i = 1; i < sortedSessions.length; i++) {
    const prevTime = new Date(sortedSessions[i - 1].createdAt).getTime();
    const currTime = new Date(sortedSessions[i].createdAt).getTime();
    totalTimeBetween += (currTime - prevTime) / (1000 * 60 * 60); // Convert to hours
    intervals++;
  }

  const avgTimeBetweenAnalyses = intervals > 0 ? Math.round(totalTimeBetween / intervals) : 0;
  const analysisFrequency = sessions.length > 0 ? Math.round((sessions.length / 7) * 10) / 10 : 0; // per week estimate

  return {
    mostActiveDay,
    mostActiveHour,
    analysisFrequency,
    avgTimeBetweenAnalyses,
    retentionRate: 85, // Placeholder - would need historical data to calculate properly
  };
}

export async function computeAnalyticsFromLocal(): Promise<AnalyticsData> {
  try {
    console.log('📊 Starting comprehensive analytics computation with background processing tracking...');
    const startTime = Date.now();
    
    // 🔍 STEP 1: Comprehensive storage scan - find ALL contract data
    const allContractData = await comprehensiveStorageScan();
    console.log(`📊 Found ${allContractData.length} total contracts from comprehensive scan`);

    // 🔄 STEP 1.5: Add background processing status tracking
    let activeProcessingJobs: string[] = [];
    try {
      const ProcessingService = (await import('../services/ProcessingService')).default;
      const processingService = ProcessingService.getInstance();
      activeProcessingJobs = processingService.getActiveJobs();
      console.log(`📊 Found ${activeProcessingJobs.length} active background processing jobs`);
    } catch (processingError) {
      console.warn('⚠️ Could not get background processing status:', processingError);
      activeProcessingJobs = []; // Ensure it's always an array
    }

    if (allContractData.length === 0 && activeProcessingJobs.length === 0) {
      console.log('📊 No contracts or processing jobs found, returning empty analytics');
      return getEmptyAnalytics();
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // 🧮 STEP 2: Compute comprehensive analytics with background processing data
    const analytics = await computeComprehensiveAnalytics(allContractData, currentDate, currentMonth, currentYear, activeProcessingJobs);

    const endTime = Date.now();
    console.log(`📊 ✅ Complete analytics computed in ${endTime - startTime}ms`);
    console.log('📊 Analytics summary:', {
      totalContracts: analytics.totalAnalyses,
      avgCompliance: analytics.avgCompliance,
      storageKeys: analytics.storageAnalysis.storageKeys.length,
      dataIntegrity: analytics.storageAnalysis.dataIntegrity
    });

    return analytics;

  } catch (error) {
    console.error('❌ Failed to compute comprehensive analytics:', error);
    return getEmptyAnalytics();
  }
}

// 🔍 Comprehensive storage scan to find ALL contract data
async function comprehensiveStorageScan(): Promise<SessionData[]> {
  const allContracts: SessionData[] = [];
  const discoveredKeys: string[] = [];
  const scanStartTime = Date.now();

  try {
    console.log('🔍 Starting comprehensive storage scan...');

    // 📋 PHASE 1: Known index-based discovery
    const indexKeys = [
      'sessions_index', 
      'shariaa_sessions', 
      'offline_analyses_index',
      'device_sessions_', // This will be handled specially
      'restoration_'
    ];

    for (const indexKey of indexKeys) {
      try {
        const indexData = await storage.getItem(indexKey);
        if (indexData) {
          const parsed = JSON.parse(indexData);
          const sessionIds = Array.isArray(parsed) ? parsed : parsed.sessions || [];
          console.log(`📋 Found ${sessionIds.length} sessions in ${indexKey}`);
          
          for (const sessionId of sessionIds) {
            const contractData = await loadContractFromMultipleSources(sessionId);
            if (contractData) {
              allContracts.push(contractData);
              discoveredKeys.push(`session_${sessionId}`);
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to scan ${indexKey}:`, e);
      }
    }

    // 📋 PHASE 2: Pattern-based key discovery (Web localStorage scan)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      console.log('🔍 Scanning localStorage for contract patterns...');
      
      const contractPatterns = [
        /^session_/, 
        /^offline_analysis_/, 
        /^analysis_/, 
        /^restoration_/,
        /^device_sessions_/,
        /^local_sessions/,
        /^contract_/
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          for (const pattern of contractPatterns) {
            if (pattern.test(key) && !discoveredKeys.includes(key)) {
              try {
                const data = localStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  
                  // Extract session ID from key
                  const sessionIdMatch = key.match(/_([^_]+)$/);
                  const sessionId = sessionIdMatch ? sessionIdMatch[1] : key;
                  
                  const contractData = await parseAndValidateContractData(parsed, sessionId);
                  if (contractData) {
                    allContracts.push(contractData);
                    discoveredKeys.push(key);
                  }
                }
              } catch (e) {
                console.warn(`Failed to parse discovered key ${key}:`, e);
              }
            }
          }
        }
      }
    }

    // 📋 PHASE 3: Deep AsyncStorage scan for React Native
    if (Platform.OS !== 'web') {
      console.log('🔍 Performing deep AsyncStorage scan...');
      try {
        // Get all keys from AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        const contractKeys = allKeys.filter(key => 
          key.startsWith('session_') || 
          key.startsWith('offline_analysis_') ||
          key.startsWith('analysis_') ||
          key.startsWith('restoration_') ||
          key.startsWith('contract_') ||
          key.includes('session')
        );

        console.log(`🔍 Found ${contractKeys.length} potential contract keys in AsyncStorage`);

        const contractData = await AsyncStorage.multiGet(contractKeys);
        for (const [key, value] of contractData) {
          if (value && !discoveredKeys.includes(key)) {
            try {
              const parsed = JSON.parse(value);
              const sessionIdMatch = key.match(/_([^_]+)$/);
              const sessionId = sessionIdMatch ? sessionIdMatch[1] : key;
              
              const contractEntry = await parseAndValidateContractData(parsed, sessionId);
              if (contractEntry) {
                allContracts.push(contractEntry);
                discoveredKeys.push(key);
              }
            } catch (e) {
              console.warn(`Failed to parse AsyncStorage key ${key}:`, e);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to scan AsyncStorage:', error);
      }
    }

    // 🧹 Remove duplicates based on session_id
    const uniqueContracts = allContracts.reduce((acc, contract) => {
      const existing = acc.find(c => c.session_id === contract.session_id);
      if (!existing) {
        acc.push(contract);
      } else if (contract.analysis_results.length > existing.analysis_results.length) {
        // Keep the contract with more analysis data
        const index = acc.findIndex(c => c.session_id === contract.session_id);
        acc[index] = contract;
      }
      return acc;
    }, [] as SessionData[]);

    const scanEndTime = Date.now();
    console.log(`🔍 ✅ Comprehensive scan completed in ${scanEndTime - scanStartTime}ms`);
    console.log(`📊 Discovered ${discoveredKeys.length} storage keys, found ${uniqueContracts.length} unique contracts`);

    return uniqueContracts;

  } catch (error) {
    console.error('❌ Comprehensive storage scan failed:', error);
    return allContracts;
  }
}

function validateAndFormatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function validateCompliance(compliance: any): number {
  const num = typeof compliance === 'number' ? compliance : parseFloat(compliance);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num)); // Clamp between 0-100
}

function computeAnalytics(sessions: SessionData[], currentDate: Date, currentMonth: number, currentYear: number): Omit<AnalyticsData, 'complianceDistribution' | 'contractTypes' | 'mostCommonIssues' | 'timeBasedPatterns' | 'qualityMetrics' | 'storageAnalysis' | 'userBehaviorInsights'> {
  // Compute analytics using device local timezone
  const totalAnalyses = sessions.length;
  
  const analysesThisMonth = sessions.filter(session => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate.getMonth() === currentMonth && 
           sessionDate.getFullYear() === currentYear;
  }).length;

  // Compute average compliance safely, handling missing values
  const validComplianceSessions = sessions.filter(session => 
    typeof session.compliance === 'number' && !isNaN(session.compliance) && session.compliance > 0
  );
  
  const avgCompliance = validComplianceSessions.length > 0 
    ? Math.round(validComplianceSessions.reduce((sum, session) => sum + session.compliance, 0) / validComplianceSessions.length)
    : 0;

  // Count recent sessions (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const recentCount = sessions.filter(session => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= weekAgo;
  }).length;

  // Get top compliant sessions (top 5)
  const topCompliantSessions = sessions
    .filter(session => typeof session.compliance === 'number' && !isNaN(session.compliance) && session.compliance > 0)
    .sort((a, b) => b.compliance - a.compliance)
    .slice(0, 5);

  // Compute monthly trend (last 6 months)
  const monthlyTrend: MonthlyTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    const monthSessions = sessions.filter(session => {
      const sessionDate = new Date(session.createdAt);
      return sessionDate.getMonth() === date.getMonth() && 
             sessionDate.getFullYear() === date.getFullYear();
    });
    
    const monthAnalyses = monthSessions.length;
    const validMonthSessions = monthSessions.filter(s => s.compliance > 0);
    const monthAvgCompliance = validMonthSessions.length > 0 ?
      Math.round(validMonthSessions.reduce((sum, s) => sum + s.compliance, 0) / validMonthSessions.length) : 0;
    
    monthlyTrend.push({
      month,
      analyses: monthAnalyses,
      avgCompliance: monthAvgCompliance
    });
  }

  // Compute performance metrics
  const successfulSessions = sessions.filter(session => 
    session.analysis_results && session.analysis_results.length > 0
  );
  
  const performanceMetrics: PerformanceMetrics = {
    avgProcessingTime: 2.5, // Placeholder - would need to track actual times
    successRate: totalAnalyses > 0 ? Math.round((successfulSessions.length / totalAnalyses) * 100) : 100,
    errorCount: totalAnalyses - successfulSessions.length
  };

  const analytics = {
    analysesThisMonth,
    avgCompliance,
    recentCount,
    totalAnalyses,
    topCompliantSessions,
    monthlyTrend,
    performanceMetrics,
  };

  console.log('📊 Analytics computed:', analytics);
  return analytics;
}

function getEmptyAnalytics(): AnalyticsData {
  return {
    analysesThisMonth: 0,
    avgCompliance: 0,
    recentCount: 0,
    totalAnalyses: 0,
    topCompliantSessions: [],
    monthlyTrend: [],
    performanceMetrics: {
      avgProcessingTime: 0,
      successRate: 100,
      errorCount: 0
    },
    complianceDistribution: {
      excellent: 0,
      good: 0,
      moderate: 0,
      poor: 0
    },
    contractTypes: [],
    mostCommonIssues: [],
    timeBasedPatterns: [],
    qualityMetrics: {
      avgTermsPerContract: 0,
      avgIssuesPerContract: 0,
      contractsWithExpertReview: 0,
      contractsWithHighCompliance: 0
    },
    storageAnalysis: {
      totalContracts: 0,
      storageKeys: [],
      dataIntegrity: 100,
      totalStorageSize: 0,
      lastScanTime: new Date().toISOString()
    },
    userBehaviorInsights: {
      mostActiveDay: 'No data',
      mostActiveHour: 0,
      analysisFrequency: 0,
      avgTimeBetweenAnalyses: 0,
      retentionRate: 0
    }
  };
}

export async function updateSessionsIndex(sessionId: string): Promise<void> {
  try {
    // Try to update both possible index keys
    const indexKeys = ['sessions_index', 'shariaa_sessions'];
    
    for (const indexKey of indexKeys) {
      try {
        const sessionsIndexData = await storage.getItem(indexKey);
        let sessionIds: string[] = [];
        
        if (sessionsIndexData) {
          try {
            const parsed = JSON.parse(sessionsIndexData);
            sessionIds = Array.isArray(parsed) ? parsed : parsed.sessions || [];
          } catch (e) {
            sessionIds = [];
          }
        }

        if (!sessionIds.includes(sessionId)) {
          sessionIds.unshift(sessionId); // Add to beginning
          // Keep only the most recent 100 sessions to prevent storage bloat
          if (sessionIds.length > 100) {
            sessionIds = sessionIds.slice(0, 100);
          }
          await storage.setItem(indexKey, JSON.stringify(sessionIds));
          console.log(`📊 Updated ${indexKey} with new session:`, sessionId);
        }
      } catch (error) {
        console.warn(`Failed to update ${indexKey}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to update sessions index:', error);
  }
}

// Cache analytics for better performance
let cachedAnalytics: AnalyticsData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedAnalytics(): Promise<AnalyticsData> {
  const now = Date.now();
  
  if (cachedAnalytics && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📊 Returning cached analytics');
    return cachedAnalytics;
  }
  
  console.log('📊 Computing fresh analytics');
  cachedAnalytics = await computeAnalyticsFromLocal();
  cacheTimestamp = now;
  
  return cachedAnalytics;
}

export function invalidateAnalyticsCache(): void {
  console.log('📊 Invalidating analytics cache');
  cachedAnalytics = null;
  cacheTimestamp = 0;
}