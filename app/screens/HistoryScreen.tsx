import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSession } from "../contexts/SessionContext";
import { useContract } from "../contexts/ContractContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";
import { ScreenType } from "../MobileApp";
import { LocalContract } from "../../types/session";
import { getOfflineAnalyses, OfflineContractAnalysis, getAllStoredSessions } from "../utils/storage";
import { SessionDetailsApiResponse } from "../services/api";
import { AlertCircle, CheckCircle, Clock, Loader } from "lucide-react-native";

interface HistoryItem {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  compliance: number;
  analysisResults: any[];
  raw: LocalContract | OfflineContractAnalysis | SessionDetailsApiResponse;
  source: 'contract' | 'offline' | 'session';
}

interface HistoryScreenProps {
  onNavigate: (screen: ScreenType, sessionId?: string) => void;
  onBack: () => void;
}

type FilterType = 'newest' | 'compliance' | 'interactions';

const FILTER_STORAGE_KEY = 'history_last_filter';

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onNavigate, onBack }) => {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { loadSessionData } = useSession();
  const { contracts, isAnalyzing, getActiveAnalyses, refreshAnalytics } = useContract();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('newest');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeProcessing, setActiveProcessing] = useState<string[]>([]);
  const [statusUpdateInterval, setStatusUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Load filter preference on mount
  useEffect(() => {
    const loadFilterPreference = async () => {
      try {
        const savedFilter = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
        if (savedFilter && ['newest', 'compliance', 'interactions'].includes(savedFilter)) {
          setActiveFilter(savedFilter as FilterType);
        }
      } catch (error) {
        console.warn('Failed to load filter preference:', error);
      }
    };
    loadFilterPreference();
  }, []);

  // Save filter preference when changed
  const handleFilterChange = useCallback(async (filter: FilterType) => {
    setActiveFilter(filter);
    try {
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch (error) {
      console.warn('Failed to save filter preference:', error);
    }
  }, []);

  const loadHistoryItems = useCallback(async () => {
    try {
      console.log("📚 Loading comprehensive history items with background processing status...");
      const items: HistoryItem[] = [];

      // Update active processing status
      const activeJobs = getActiveAnalyses();
      setActiveProcessing(activeJobs);
      console.log(`🔄 Found ${activeJobs.length} active background analyses`);

      // 1. Load from ContractContext (LocalContract[])
      console.log(`📋 Loading ${contracts.length} contracts from ContractContext`);
      contracts.forEach(contract => {
        const item: HistoryItem = {
          id: `contract_${contract.id}`,
          sessionId: contract.sessionId,
          title: contract.name,
          createdAt: contract.analysisDate,
          compliance: contract.complianceScore,
          analysisResults: contract.data?.analysis_results || [],
          raw: contract,
          source: 'contract'
        };
        items.push(item);
      });

      // 2. Load offline analyses
      try {
        const offlineAnalyses = await getOfflineAnalyses();
        console.log(`📱 Loading ${offlineAnalyses.length} offline analyses`);

        offlineAnalyses.forEach(analysis => {
          // Avoid duplicates
          const existsInContracts = items.some(item => item.sessionId === analysis.sessionId);
          if (!existsInContracts) {
            const item: HistoryItem = {
              id: `offline_${analysis.id}`,
              sessionId: analysis.sessionId,
              title: analysis.originalFilename,
              createdAt: analysis.analysisDate,
              compliance: analysis.complianceScore,
              analysisResults: analysis.fullSessionData?.analysis_results || [],
              raw: analysis,
              source: 'offline'
            };
            items.push(item);
          }
        });
      } catch (error) {
        console.warn('Failed to load offline analyses:', error);
      }

      // 3. Load stored sessions
      try {
        const storedSessions = await getAllStoredSessions();
        console.log(`💾 Loading ${storedSessions.length} stored sessions`);

        storedSessions.forEach(session => {
          // Avoid duplicates
          const existsAlready = items.some(item => item.sessionId === session.session_id);
          if (!existsAlready) {
            const item: HistoryItem = {
              id: `session_${session.session_id}`,
              sessionId: session.session_id,
              title: session.original_filename || `Session ${session.session_id.substring(0, 8)}`,
              createdAt: session.analysis_timestamp || new Date().toISOString(),
              compliance: session.compliance_percentage || 0,
              analysisResults: session.analysis_results || [],
              raw: session,
              source: 'session'
            };
            items.push(item);
          }
        });
      } catch (error) {
        console.warn('Failed to load stored sessions:', error);
      }

      console.log(`📚 Total history items loaded: ${items.length}`);
      setHistoryItems(items);
    } catch (error) {
      console.error("❌ Failed to load history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contracts]);

  // Debounced search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search with 200ms delay
    const timeout = setTimeout(() => {
      console.log('🔍 Search query:', query);
    }, 200);

    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Memoized filtered and sorted items for efficiency
  const filteredAndSortedItems = useMemo(() => {
    let filtered = historyItems;

    // Apply search filter - case-insensitive, partial match
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.sessionId.toLowerCase().includes(query)
      );
    }

    // Apply filter-specific sorting
    switch (activeFilter) {
      case 'newest':
        // Sort by createdAt descending (newest first)
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      case 'compliance':
        // Sort by compliance ascending (lowest first)
        return filtered.sort((a, b) => a.compliance - b.compliance);

      case 'interactions':
        // Sort by analysis_results.length descending (most interactions first)
        return filtered.sort((a, b) => b.analysisResults.length - a.analysisResults.length);

      default:
        return filtered;
    }
  }, [historyItems, searchQuery, activeFilter]);

  useEffect(() => {
    loadHistoryItems();
  }, [loadHistoryItems]);

  // Monitor background processing status in real-time
  useEffect(() => {
    const updateProcessingStatus = () => {
      const activeJobs = getActiveAnalyses();
      setActiveProcessing(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(activeJobs)) {
          console.log(`🔄 Processing status changed: ${prev.length} -> ${activeJobs.length} active`);

          // If processing completed, refresh analytics and reload
          if (prev.length > activeJobs.length) {
            console.log('✅ Analysis completed, refreshing data...');
            refreshAnalytics();
            loadHistoryItems();
          }

          return activeJobs;
        }
        return prev;
      });
    };

    // Check immediately
    updateProcessingStatus();

    // Set up periodic checks
    const interval = setInterval(updateProcessingStatus, 2000); // Check every 2 seconds
    setStatusUpdateInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [getActiveAnalyses, refreshAnalytics, loadHistoryItems]);

  // Refresh history when app comes to foreground (background tasks may have completed)
  useEffect(() => {
    const { AppState } = require('react-native');

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - refreshing history');
        loadHistoryItems();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [loadHistoryItems]);

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistoryItems();
  }, [loadHistoryItems]);

  const handleItemPress = useCallback(async (item: HistoryItem) => {
    console.log("📄 Opening session:", item.sessionId, "from source:", item.source);

    try {
      // Load session data into SessionContext before navigating
      await loadSessionData(item.sessionId);

      // Navigate to results screen
      onNavigate("results", item.sessionId);
    } catch (error) {
      console.error("❌ Failed to load session data:", error);
      // Still try to navigate - SessionContext might have fallback logic
      onNavigate("results", item.sessionId);
    }
  }, [onNavigate, loadSessionData]);

  const renderFilterButton = useCallback((filter: FilterType, labelKey: string) => {
    const isActive = activeFilter === filter;
    const label = t(`filter_${labelKey}`) || labelKey;

    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterButton,
          isActive && styles.activeFilterButton,
        ]}
        onPress={() => handleFilterChange(filter)}
      >
        <Text style={[
          styles.filterButtonText,
          isActive && styles.activeFilterButtonText,
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeFilter, handleFilterChange, t]);

  const renderHistoryItem = useCallback(({ item }: { item: HistoryItem }) => {
    const isProcessing = activeProcessing.includes(item.sessionId);
    const isAnalyzingSession = isAnalyzing(item.sessionId);
    const hasIncompleteData = !item.analysisResults || item.analysisResults.length === 0;

    const complianceColor = item.compliance >= 70 ? colors.primary : 
                          item.compliance >= 40 ? '#f59e0b' : '#ef4444';
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString(isRTL ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Determine status and icon
    let statusIcon = null;
    let statusText = '';
    let statusColor = '#6b7280';

    if (isProcessing || isAnalyzingSession) {
      statusIcon = <Loader size={14} color="#3b82f6" />;
      statusText = t('processing') || 'Processing...';
      statusColor = '#3b82f6';
    } else if (hasIncompleteData) {
      statusIcon = <Clock size={14} color="#f59e0b" />;
      statusText = t('pending') || 'Pending';
      statusColor = '#f59e0b';
    } else {
      statusIcon = <CheckCircle size={14} color="#10b981" />;
      statusText = t('completed') || 'Completed';
      statusColor = '#10b981';
    }

    return (
      <TouchableOpacity
        style={[
          styles.historyItem,
          (isProcessing || isAnalyzingSession) && styles.processingItem
        ]}
        onPress={() => handleItemPress(item)}
        disabled={isProcessing || isAnalyzingSession}
      >
        <View style={styles.historyItemContent}>
          <View style={styles.historyItemHeader}>
            <Text style={styles.historyItemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.statusAndCompliance}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                {statusIcon}
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
              {!isProcessing && !isAnalyzingSession && (
                <View style={[styles.complianceBadge, { backgroundColor: complianceColor }]}>
                  <Text style={styles.complianceBadgeText}>
                    {Math.round(item.compliance)}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.historyItemMeta}>
            <Text style={styles.historyItemDate}>{formattedDate}</Text>
            <Text style={styles.historyItemInteractions}>
              {isProcessing || isAnalyzingSession 
                ? (t('analyzing') || 'Analyzing...') 
                : `${item.analysisResults.length} ${t('terms') || 'terms'}`}
            </Text>
            <Text style={styles.historyItemSource}>
              {item.source === 'contract' ? '' : item.source === 'offline' ? '' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.historyItemArrow}>
          <Text style={styles.historyItemArrowText}>
            {isRTL ? '←' : '→'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleItemPress, isRTL, t]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {searchQuery.trim() 
          ? t('no_contracts_found') || 'No contracts found'
          : t('no_contracts') || 'No contracts analyzed yet'
        }
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery.trim() 
          ? t('try_adjusting_search') || 'Try adjusting your search or filters'
          : t('upload_first_contract') || 'Upload and analyze your first contract to see it here'
        }
      </Text>
    </View>
  ), [searchQuery, t]);

  const backgroundColor = theme === 'dark' ? colors.gray900 : colors.background;
  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? colors.gray900 : colors.background}
      />
      <View style={styles.safeTopSpace} />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t('search') || 'Search contracts...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter Buttons - exactly 3 as required */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('newest', 'newest')}
        {renderFilterButton('compliance', 'compliance')}
        {renderFilterButton('interactions', 'interactions')}
      </View>

      {/* Results Count */}
      {!loading && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {filteredAndSortedItems.length} {t('results') || 'results'}
          </Text>
        </View>
      )}

      {/* History List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {t('loading') || 'Loading...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            filteredAndSortedItems.length === 0 ? styles.emptyListContainer : styles.listContent
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeTopSpace: {
    height: 0, // This will be adjusted by SafeAreaView's top edge, but we need the view for the structure.
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeFilterButtonText: {
    color: 'white',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  historyItem: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  complianceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complianceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  historyItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyItemInteractions: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyItemSource: {
    fontSize: 12,
  },
  historyItemArrow: {
    marginLeft: 12,
  },
  historyItemArrowText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusAndCompliance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  processingItem: {
    opacity: 0.7,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
});

export default HistoryScreen;