import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { storage, storeSessionData, getOfflineAnalyses } from '../utils/storage';
import { SessionDetails, LocalContract } from '../../types/session';
import { computeAnalyticsFromLocal } from '../utils/analytics';
import ProcessingService from '../services/ProcessingService';
import BackgroundTaskManager from '../services/BackgroundTaskManager';
import { notificationsService } from '../services/NotificationsService';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useSession } from './SessionContext';

interface ContractContextType {
  contracts: LocalContract[];
  addContract: (contract: LocalContract) => Promise<void>;
  removeContract: (id: string) => Promise<void>;
  updateContract: (id: string, updates: Partial<LocalContract>) => Promise<void>;
  getContract: (id: string) => LocalContract | undefined;
  clearContracts: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // Background processing functions
  startBackgroundAnalysis: (sessionId: string, file: any) => Promise<void>;
  isAnalyzing: (sessionId: string) => boolean;
  getActiveAnalyses: () => string[];
  refreshAnalytics: () => Promise<void>;
  analytics: any;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const { setIsAnalyzingContract } = useSession();
  const [contracts, setContracts] = useState<LocalContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [processingService] = useState(() => ProcessingService.getInstance());
  const [backgroundTaskManager] = useState(() => BackgroundTaskManager.getInstance());

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      console.log('🔄 Initializing ContractContext services...');
      
      // Initialize processing service
      await processingService.initialize();
      
      // Initialize background task manager
      await backgroundTaskManager.initialize();
      
      // Initialize notifications
      await notificationsService.requestPermissions();
      
      // Load contracts and refresh analytics
      await Promise.all([
        loadContracts(),
        refreshAnalytics()
      ]);
      
      console.log('✅ ContractContext services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ContractContext services:', error);
      setError('Failed to initialize services');
    }
  };

  const loadContracts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load contracts from multiple sources with comprehensive analytics update
      console.log('🔄 Loading contracts and refreshing analytics...');
      
      // Load from local storage (primary source)
      const localData = await storage.getItemAsync('contracts_local');
      let localContracts: LocalContract[] = [];
      
      if (localData) {
        localContracts = JSON.parse(localData);
        console.log('📊 Local contracts loaded:', localContracts.length);
      }
      
      // Load from offline analyses storage (comprehensive backup)
      const offlineAnalyses = await getOfflineAnalyses();
      console.log('📊 Offline analyses found:', offlineAnalyses.length);
      
      // Merge and deduplicate contracts
      const mergedContracts = new Map<string, LocalContract>();
      
      // Add local contracts first
      localContracts.forEach(contract => {
        mergedContracts.set(contract.id, contract);
      });
      
      // Add offline analyses as contracts if not already present
      offlineAnalyses.forEach(analysis => {
        if (!mergedContracts.has(analysis.sessionId)) {
          const contract: LocalContract = {
            id: analysis.sessionId,
            name: analysis.originalFilename,
            analysisDate: analysis.analysisDate,
            complianceScore: analysis.complianceScore,
            sessionId: analysis.sessionId,
            data: analysis.fullSessionData ? {
              id: analysis.sessionId,
              createdAt: analysis.analysisDate,
              analysis_results: analysis.fullSessionData.analysis_results?.map(term => ({
                id: term.term_id || Math.random().toString(),
                title: term.term_text?.substring(0, 50) + "..." || "Analysis Term",
                description: term.sharia_issue || "No issues found",
                compliance: term.is_valid_sharia ? 100 : 0,
              })) || [],
              fileName: analysis.originalFilename,
              complianceScore: analysis.complianceScore,
            } : undefined,
            interactions: 0,
            modifications: 0,
            hasGeneratedContract: false,
            fileSize: "Unknown",
            lastViewed: analysis.analysisDate,
          };
          mergedContracts.set(analysis.sessionId, contract);
        }
      });
      
      const finalContracts = Array.from(mergedContracts.values())
        .sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime());
      
      setContracts(finalContracts);
      console.log('✅ Total contracts loaded and merged:', finalContracts.length);
      
      // Save merged contracts back to local storage
      if (finalContracts.length > localContracts.length) {
        await storage.setItemAsync('contracts_local', JSON.stringify(finalContracts));
        console.log('💾 Merged contracts saved to local storage');
      }
      
    } catch (error) {
      console.error('Error loading contracts:', error);
      setError('Failed to load contracts from local storage');
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      console.log('📊 Refreshing analytics from local data...');
      const analyticsData = await computeAnalyticsFromLocal();
      setAnalytics(analyticsData);
      console.log('✅ Analytics refreshed:', {
        totalContracts: analyticsData.totalAnalyses,
        avgCompliance: analyticsData.avgCompliance
      });
    } catch (error) {
      console.error('❌ Failed to refresh analytics:', error);
    }
  }, []);

  const saveContracts = async (contractsToSave: LocalContract[]) => {
    try {
      await storage.setItemAsync('contracts_local', JSON.stringify(contractsToSave));
      // Auto-refresh analytics when contracts change
      await refreshAnalytics();
    } catch (error) {
      console.error('Failed to save contracts:', error);
      throw error;
    }
  };

  const addContract = async (contract: LocalContract) => {
    try {
      const updatedContracts = [contract, ...contracts];
      setContracts(updatedContracts);
      await saveContracts(updatedContracts);
      console.log('✅ Contract added:', contract.name);
      
      // Send notification when contract is actually added to history (only for completed analysis)
      if (!contract.isProcessing && contract.data?.analysis_results && contract.data.analysis_results.length > 0) {
        console.log('📱 Sending completion notification for completed contract');
        await notificationsService.scheduleContractProcessedNotification(
          contract.name,
          contract.sessionId
        );
      }
    } catch (error) {
      console.error('Failed to add contract:', error);
      setError('Failed to save contract');
    }
  };

  const removeContract = async (id: string) => {
    try {
      const updatedContracts = contracts.filter(c => c.id !== id);
      setContracts(updatedContracts);
      await saveContracts(updatedContracts);
      console.log('🗑️ Contract removed:', id);
    } catch (error) {
      console.error('Failed to remove contract:', error);
      setError('Failed to remove contract');
    }
  };

  const updateContract = async (id: string, updates: Partial<LocalContract>) => {
    try {
      const existingContract = contracts.find(c => c.id === id);
      const wasProcessing = existingContract?.isProcessing;
      
      const updatedContracts = contracts.map(c => 
        c.id === id ? { ...c, ...updates, lastViewed: new Date().toISOString() } : c
      );
      setContracts(updatedContracts);
      await saveContracts(updatedContracts);
      console.log('✏️ Contract updated:', id);
      
      // Send notification when contract transitions from processing to completed
      const updatedContract = updatedContracts.find(c => c.id === id);
      if (wasProcessing && 
          !updatedContract?.isProcessing && 
          updatedContract?.data?.analysis_results && 
          updatedContract.data.analysis_results.length > 0) {
        console.log('📱 Contract analysis completed - triggering immediate navigation');
        
        // Deactivate keep awake since analysis is complete
        console.log('😴 Deactivating keep awake - contract analysis completed');
        try {
          await deactivateKeepAwake();
        } catch (deactivateError) {
          console.warn('⚠️ Failed to deactivate keep awake after contract completion:', deactivateError);
        }
        
        // Unlock navigation immediately since analysis is complete
        console.log('🔓 Unlocking navigation - analysis completed');
        setIsAnalyzingContract(false);
        
        // Send completion notification
        await notificationsService.scheduleContractProcessedNotification(
          updatedContract.name,
          updatedContract.sessionId
        );
        
        console.log('🚀 Analysis completion handled - navigation should now be unlocked');
      }
    } catch (error) {
      console.error('Failed to update contract:', error);
      setError('Failed to update contract');
    }
  };

  const getContract = (id: string): LocalContract | undefined => {
    return contracts.find(c => c.id === id);
  };

  const clearContracts = async () => {
    try {
      setContracts([]);
      await storage.deleteItemAsync('contracts_local');
      await refreshAnalytics();
      console.log('🧹 All contracts cleared');
    } catch (error) {
      console.error('Failed to clear contracts:', error);
      setError('Failed to clear contracts');
    }
  };

  // Background processing functions
  const startBackgroundAnalysis = async (sessionId: string, file: any) => {
    try {
      console.log('🚀 Starting background analysis for session:', sessionId);
      
      // Activate keep awake for the entire analysis process
      console.log('⏰ Activating keep awake for background analysis');
      await activateKeepAwake();
      
      // Start background upload if file is provided
      if (file) {
        await backgroundTaskManager.startBackgroundUpload(sessionId, file);
      }
      
      // Start background processing
      await processingService.startAnalysis(sessionId);
      
      console.log('✅ Background analysis started for session:', sessionId);
    } catch (error) {
      console.error('❌ Failed to start background analysis:', error);
      // Deactivate keep awake if analysis startup failed
      try {
        await deactivateKeepAwake();
      } catch (deactivateError) {
        console.warn('⚠️ Failed to deactivate keep awake after analysis startup failure:', deactivateError);
      }
      
      // Unlock navigation since analysis startup failed
      console.log('🔓 Unlocking navigation - analysis startup failed');
      setIsAnalyzingContract(false);
      throw error;
    }
  };

  const isAnalyzing = (sessionId: string): boolean => {
    const activeJobs = processingService.getActiveJobs();
    return activeJobs.includes(sessionId);
  };

  const getActiveAnalyses = (): string[] => {
    return processingService.getActiveJobs();
  };

  return (
    <ContractContext.Provider value={{
      contracts,
      addContract,
      removeContract,
      updateContract,
      getContract,
      clearContracts,
      isLoading,
      error,
      startBackgroundAnalysis,
      isAnalyzing,
      getActiveAnalyses,
      refreshAnalytics,
      analytics
    }}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = (): ContractContextType => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within a ContractProvider');
  }
  return context;
};

export default ContractProvider;