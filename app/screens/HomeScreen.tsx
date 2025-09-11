import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  Platform, // Import Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useContract } from "../contexts/ContractContext";
import {
  FileText,
  TrendingUp,
  Shield,
  Camera,
  Upload,
  AlertCircle,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { ScreenType } from "../MobileApp";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Corrected import path
// Assume useAuth and other necessary hooks are imported
// import { useAuth } from "../contexts/AuthContext"; // Uncomment if needed

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [hasError, setHasError] = React.useState(false);

  try {
    const { theme } = useTheme();
    // const { t, isRTL } = useLanguage(); // Use t directly
    const { t } = useLanguage(); // Keep only t
    // const { user } = useAuth(); // Uncomment if user is needed
    const isDark = theme === "dark";

    // Reset error state if we got here successfully
    React.useEffect(() => {
      if (hasError) {
        setHasError(false);
      }
    }, [hasError]);

    const { contracts, isLoading, error, analytics, refreshAnalytics } =
      useContract();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
      totalContracts: 0,
      contractsThisMonth: 0,
      averageCompliance: 0,
      processingTime: 0,
    });

    // Calculate statistics from local contracts
    useEffect(() => {
      calculateStats();
    }, [contracts]);

    const calculateStats = () => {
      if (!contracts || contracts.length === 0) {
        setStats({
          totalContracts: 0,
          contractsThisMonth: 0,
          averageCompliance: 0,
          processingTime: 0,
        });
        return;
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter contracts from this month
      const thisMonthContracts = contracts.filter((contract) => {
        const contractDate = new Date(contract.analysisDate);
        return (
          contractDate.getMonth() === currentMonth &&
          contractDate.getFullYear() === currentYear
        );
      });

      // Calculate average compliance score
      const validScores = contracts.filter(
        (c) => typeof c.complianceScore === "number",
      );
      const averageCompliance =
        validScores.length > 0
          ? validScores.reduce(
              (sum, contract) => sum + contract.complianceScore,
              0,
            ) / validScores.length
          : 0;

      // Calculate average processing time (mock data for now)
      const processingTime = contracts.length > 0 ? 2.3 : 0;

      setStats({
        totalContracts: contracts.length,
        contractsThisMonth: thisMonthContracts.length,
        averageCompliance: Math.round(averageCompliance),
        processingTime,
      });

      console.log("📊 Stats calculated:", {
        total: contracts.length,
        thisMonth: thisMonthContracts.length,
        avgCompliance: Math.round(averageCompliance),
      });
    };

    const onRefresh = async () => {
      setRefreshing(true);
      // Simply recalculate stats from existing local data
      calculateStats();
      setRefreshing(false);
    };

    const handleQuickAction = (action: string) => {
      switch (action) {
        case "upload":
          onNavigate("upload");
          break;
        case "camera":
          onNavigate("camera");
          break;
        case "history":
          onNavigate("history");
          break;
        case "analytics":
          // Show current analytics in an alert
          Alert.alert(
            t("analytics.title"),
            `${t("home.stats.totalContracts")}: ${stats.totalContracts}\n${t("home.stats.thisMonth")}: ${stats.contractsThisMonth}\n${t("home.stats.avgCompliance")}: ${stats.averageCompliance}%\n${t("home.stats.avgTime")}: ${stats.processingTime}s`,
            [{ text: t("common.ok"), style: "default" }],
          );
          break;
        default:
          break;
      }
    };

    const getRecentContracts = () => {
      return contracts
        .sort(
          (a, b) =>
            new Date(b.analysisDate).getTime() -
            new Date(a.analysisDate).getTime(),
        )
        .slice(0, 3);
    };

    if (error) {
      return (
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: isDark ? "#111827" : "#f9fafb" },
          ]}
        >
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.error} />
            <Text
              style={[
                styles.errorText,
                { color: isDark ? "#f3f4f6" : "#111827" },
              ]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
              ]}
              onPress={onRefresh}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  { color: isDark ? colors.gray100 : colors.gray800 },
                ]}
              >
                {t("common.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    if (hasError) {
      return (
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: isDark ? "#111827" : "#f9fafb" },
          ]}
        >
          <View style={styles.errorContainer}>
            <Text
              style={[
                styles.errorText,
                { color: isDark ? "#f3f4f6" : "#111827" },
              ]}
            >
              {t("Something went wrong loading the home screen")}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => setHasError(false)}
            >
              <Text style={styles.retryButtonText}>{t("Retry")}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? "#111827" : "#f9fafb" },
        ]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={isDark ? "#111827" : "#f9fafb"}
        />
        <View style={styles.safeTopSpace} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primaryGreen]}
              tintColor={isDark ? "#f3f4f6" : "#111827"}
            />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeHeader}>
              <View>
                <Text
                  style={[
                    styles.welcomeTitle,
                    { color: isDark ? "#f3f4f6" : "#111827" },
                  ]}
                >
                  {t("home.welcome")}
                </Text>
                <Text
                  style={[
                    styles.welcomeSubtitle,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  {t("home.subtitle")}
                </Text>
              </View>
              <View
                style={[
                  styles.welcomeBadge,
                  {
                    backgroundColor: isDark ? "#374151" : "#ecfccb",
                  },
                ]}
              >
                <Shield size={24} color={colors.primaryGreen} />
              </View>
            </View>

            {contracts.length > 0 && (
              <View
                style={[
                  styles.quickStats,
                  { backgroundColor: isDark ? "#374151" : "#ffffff" },
                ]}
              >
                <View style={styles.quickStatItem}>
                  <Text
                    style={[
                      styles.quickStatNumber,
                      { color: colors.primaryGreen },
                    ]}
                  >
                    {stats.totalContracts}
                  </Text>
                  <Text
                    style={[
                      styles.quickStatLabel,
                      { color: isDark ? "#9ca3af" : "#6b7280" },
                    ]}
                  >
                    {t("home.stats.totalContracts")}
                  </Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Text
                    style={[styles.quickStatNumber, { color: colors.primary }]}
                  >
                    {stats.averageCompliance}%
                  </Text>
                  <Text
                    style={[
                      styles.quickStatLabel,
                      { color: isDark ? "#9ca3af" : "#6b7280" },
                    ]}
                  >
                    {t("home.stats.avgCompliance")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "#374151" : "#ffffff" },
              ]}
            >
              <FileText size={24} color={colors.primaryGreen} />
              <Text
                style={[
                  styles.statNumber,
                  { color: isDark ? "#f3f4f6" : "#111827" },
                ]}
              >
                {isLoading ? "..." : stats.totalContracts}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? "#9ca3af" : "#6b7280" },
                ]}
              >
                {t("home.stats.totalContracts")}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "#374151" : "#ffffff" },
              ]}
            >
              <TrendingUp size={24} color={colors.primary} />
              <Text
                style={[
                  styles.statNumber,
                  { color: isDark ? "#f3f4f6" : "#111827" },
                ]}
              >
                {isLoading ? "..." : stats.contractsThisMonth}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? "#9ca3af" : "#6b7280" },
                ]}
              >
                {t("home.stats.thisMonth")}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "#374151" : "#ffffff" },
              ]}
            >
              <Shield size={24} color={colors.secondary} />
              <Text
                style={[
                  styles.statNumber,
                  { color: isDark ? "#f3f4f6" : "#111827" },
                ]}
              >
                {isLoading ? "..." : `${stats.averageCompliance}%`}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? "#9ca3af" : "#6b7280" },
                ]}
              >
                {t("home.stats.avgCompliance")}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? "#f3f4f6" : "#111827" },
              ]}
            >
              {t("home.quickActions")}
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  styles.primaryAction,
                  { backgroundColor: colors.primaryGreen },
                ]}
                onPress={() => handleQuickAction("upload")}
              >
                <View style={styles.actionIconContainer}>
                  <Upload size={32} color="#ffffff" />
                </View>
                <Text style={styles.actionText}>
                  {t("home.actions.upload")}
                </Text>
                <Text style={styles.actionSubtext}>PDF, DOCX, TXT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.primary }]}
                onPress={() => handleQuickAction("camera")}
              >
                <View style={styles.actionIconContainer}>
                  <Camera size={28} color="#ffffff" />
                </View>
                <Text style={styles.actionText}>
                  {t("home.actions.camera")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.primaryGreen },
                ]}
                onPress={() => handleQuickAction("history")}
              >
                <View style={styles.actionIconContainer}>
                  <FileText size={28} color="#ffffff" />
                </View>
                <Text style={styles.actionText}>
                  {t("home.actions.history")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Contracts */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? "#f3f4f6" : "#111827" },
              ]}
            >
              {t("home.recentContracts")}
            </Text>
            {isLoading ? (
              <View
                style={[
                  styles.contractCard,
                  { backgroundColor: isDark ? "#374151" : "#ffffff" },
                ]}
              >
                <Text
                  style={[
                    styles.loadingText,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  {t("common.loading")}
                </Text>
              </View>
            ) : getRecentContracts().length > 0 ? (
              getRecentContracts().map((contract) => (
                <TouchableOpacity
                  key={contract.id}
                  style={[
                    styles.contractCard,
                    { backgroundColor: isDark ? "#374151" : "#ffffff" },
                  ]}
                  onPress={() => onNavigate("history")}
                >
                  <View style={styles.contractInfo}>
                    <Text
                      style={[
                        styles.contractName,
                        { color: isDark ? "#f3f4f6" : "#111827" },
                      ]}
                    >
                      {contract.name}
                    </Text>
                    <Text
                      style={[
                        styles.contractDate,
                        { color: isDark ? "#9ca3af" : "#6b7280" },
                      ]}
                    >
                      {new Date(contract.analysisDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.complianceBadge,
                      {
                        backgroundColor:
                          contract.complianceScore >= 70
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    <Text style={styles.complianceText}>
                      {contract.complianceScore}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View
                style={[
                  styles.contractCard,
                  { backgroundColor: isDark ? "#374151" : "#ffffff" },
                ]}
              >
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  {t("home.noContracts")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  } catch (error) {
    console.error("❌ HomeScreen render error:", error);
    setHasError(true);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#000" }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading home screen</Text>
        </View>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  safeTopSpace: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  scrollView: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingTop: 20, // Add padding to avoid notch/punch hole
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  welcomeBadge: {
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 8,
  },
  quickStats: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statCard: {
    width: "48%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryAction: {
    width: "100%",
    marginBottom: 20,
  },
  actionIconContainer: {
    marginBottom: 12,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  actionSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    textAlign: "center",
  },
  contractCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  contractInfo: {
    flex: 1,
  },
  contractName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  contractDate: {
    fontSize: 12,
  },
  complianceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  complianceText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default HomeScreen;
