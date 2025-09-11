import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  AppState,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSession } from "../contexts/SessionContext";
import { useContract } from "../contexts/ContractContext";
import { ArrowLeft, CheckCircle, Upload, FileText } from "lucide-react-native";
import AnalyzingAnimation from "../components/AnalyzingAnimation";
import { uploadContract } from "../services/api";
import { SessionDetails, LocalContract } from "../../types/session";
import { storage, storeOfflineAnalysis } from "../utils/storage";
import * as Notifications from "expo-notifications";
import * as DocumentPicker from "expo-document-picker";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";

interface UploadScreenProps {
  onBack: () => void;
  onAnalysisComplete: (sessionId: string) => void;
  preSelectedFile?: any;
  fromCamera?: boolean;
  autoUpload?: boolean;
}

const UploadScreen: React.FC<UploadScreenProps> = ({
  onBack,
  onAnalysisComplete,
  preSelectedFile,
  fromCamera = false,
  autoUpload = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { loadSessionData, isAnalyzingContract, setIsAnalyzingContract } = useSession();
  const { addContract, updateContract, startBackgroundAnalysis, isAnalyzing: isAnalyzingInContext } = useContract();

  const [selectedFile, setSelectedFile] = useState<any>(
    preSelectedFile || null,
  );
  // Using global isAnalyzingContract state from SessionContext instead of local state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const isDark = theme === "dark";

  useEffect(() => {
    if (preSelectedFile && autoUpload) {
      handleAnalyze();
    }
  }, [preSelectedFile, autoUpload]);

  // Monitor app state changes during analysis
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const previousState = appState.current;
      appState.current = nextAppState;

      if (isAnalyzingContract && currentSessionId) {
        if (nextAppState === 'background' && previousState === 'active') {
          console.log('📱 App backgrounded during analysis, continuing in background...');
        } else if (nextAppState === 'active' && previousState === 'background') {
          console.log('📱 App foregrounded during analysis, checking status...');
          // Check if analysis completed while backgrounded
          checkAnalysisCompletion();
        }
      }
    });

    return () => subscription?.remove();
  }, [isAnalyzingContract, currentSessionId]);

  // Monitor analysis completion from ContractContext
  useEffect(() => {
    if (currentSessionId && !isAnalyzingInContext(currentSessionId) && isAnalyzingContract) {
      console.log('✅ Analysis completed for session:', currentSessionId);
      handleAnalysisCompletion();
    }
  }, [currentSessionId, isAnalyzingInContext, isAnalyzingContract]);



  const checkAnalysisCompletion = async () => {
    if (!currentSessionId) return;

    // Check if analysis is still running
    const stillAnalyzing = isAnalyzingInContext(currentSessionId);
    if (!stillAnalyzing && isAnalyzingContract) {
      handleAnalysisCompletion();
    }
  };

  const handleAnalysisCompletion = async () => {
    console.log('🎉 Analysis completed');
    setAnalysisComplete(true);
    setUploadProgress(100);

    // Deactivate keep awake since analysis is complete
    console.log("😴 Deactivating keep awake - analysis complete");
    try {
      await deactivateKeepAwake();
    } catch (error) {
      console.warn("⚠️ Failed to deactivate keep awake:", error);
    }

    // Clear global analysis state to unlock navigation
    setIsAnalyzingContract(false);

    // Immediate navigation to results
    if (currentSessionId) {
      console.log('🚀 Auto-navigating to results for session:', currentSessionId);
      onAnalysisComplete(currentSessionId);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        console.log("📁 UploadScreen: File selected:", {
          name: file.name,
          type: file.mimeType,
          size: file.size,
        });
        setSelectedFile(file);
        setAnalysisComplete(false);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      Alert.alert(t("upload.error"), t("upload.selectFileError"));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      Alert.alert(t("upload.error"), t("upload.selectFileFirst"));
      return;
    }

    try {
      setIsAnalyzingContract(true); // Set global analysis state for navigation lock
      setUploadProgress(0);
      setAnalysisComplete(false);

      // Activate keep awake to prevent screen lock during analysis
      console.log("⏰ Activating keep awake for analysis");
      await activateKeepAwake();

      console.log("🚀 Starting analysis for file:", selectedFile.name);

      // Try foreground upload first, then fallback to background
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 200);

      try {
        // Try foreground upload first
        const result = await uploadContract(selectedFile, setUploadProgress);
        clearInterval(progressInterval);

        // Use the actual session ID from the server
        const actualSessionId = result.session_id;
        setCurrentSessionId(actualSessionId);
        console.log('📤 Upload successful, using session ID:', actualSessionId);

        // Create contract with real session ID
        const contract: LocalContract = {
          id: actualSessionId,
          name: selectedFile.name,
          analysisDate: new Date().toISOString(),
          complianceScore: result.analysis_results?.length > 0
            ? Math.round(
                (result.analysis_results.filter((r) => r.is_valid_sharia).length /
                  result.analysis_results.length) * 100
              )
            : 0,
          sessionId: actualSessionId,
          data: {
            id: actualSessionId,
            createdAt: new Date().toISOString(),
            analysis_results: result.analysis_results?.map((term) => ({
              id: term.term_id || Math.random().toString(),
              title: term.term_text?.substring(0, 50) + "..." || "Analysis Term",
              description: term.sharia_issue || "No issues found",
              compliance: term.is_valid_sharia ? 100 : 0,
            })) || [],
            fileName: selectedFile.name,
            complianceScore: 0,
          },
          interactions: 0,
          modifications: 0,
          hasGeneratedContract: false,
          fileSize: selectedFile.size
            ? `${Math.round(selectedFile.size / 1024)} KB`
            : "0 KB",
          lastViewed: new Date().toISOString(),
          isProcessing: false,
        };

        await addContract(contract);
        await loadSessionData(actualSessionId);

        // Analysis completed immediately - unlock navigation
        handleAnalysisCompletion();

        return actualSessionId;

      } catch (error) {
        console.log("📤 Foreground upload failed, starting background upload:", error);
        clearInterval(progressInterval);

        // Generate temporary session ID for background processing
        const tempSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(tempSessionId);

        // Start background upload as fallback
        await startBackgroundAnalysis(tempSessionId, selectedFile);

        // Create placeholder contract
        const placeholderContract: LocalContract = {
          id: tempSessionId,
          name: selectedFile.name,
          analysisDate: new Date().toISOString(),
          complianceScore: 0,
          sessionId: tempSessionId,
          data: undefined,
          interactions: 0,
          modifications: 0,
          hasGeneratedContract: false,
          fileSize: selectedFile.size
            ? `${Math.round(selectedFile.size / 1024)} KB`
            : "0 KB",
          lastViewed: new Date().toISOString(),
          isProcessing: true,
        };

        await addContract(placeholderContract);

        // Keep analysis animation and navigation lock active for background processing
        setUploadProgress(50); // Show some progress

        return tempSessionId;
      }
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      setCurrentSessionId(null);

      Alert.alert(
        t("upload.analysisError"),
        error instanceof Error ? error.message : t("upload.unknownError"),
        [{ text: t("common.ok"), style: "default" }],
      );
    } finally {
      // Don't reset analyzing state here - let background completion handle it
      if (!currentSessionId) {
        setIsAnalyzingContract(false); // Clear global analysis state on failure
        setUploadProgress(0);
        // Deactivate keep awake if analysis failed and not continuing in background
        console.log("😴 Deactivating keep awake - analysis failed");
        try {
          await deactivateKeepAwake();
        } catch (error) {
          console.warn("⚠️ Failed to deactivate keep awake:", error);
        }
      }
    }
  };

  const scheduleAnalysisCompleteNotification = async (
    fileName: string,
    sessionId: string,
  ) => {
    try {
      // Request permissions if not already granted
      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== "granted") {
        console.warn("🔔 Notification permission not granted");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("notifications.analysisComplete"),
          body: (t as any)("notifications.contractReady", { fileName }),
          data: {
            type: "analysis_complete",
            sessionId,
            fileName,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });

      console.log("🔔 Analysis complete notification scheduled");
    } catch (error) {
      console.warn("🔔 Failed to schedule notification:", error);
    }
  };

  const renderContent = () => {
    if (analysisComplete) {
      return (
        <View style={styles.completionContainer}>
          <CheckCircle size={64} color="#10b981" />
          <Text
            style={[
              styles.completionTitle,
              { color: isDark ? "#f3f4f6" : "#111827" },
            ]}
          >
            {t("upload.analysisComplete")}
          </Text>
          <Text
            style={[
              styles.completionSubtitle,
              { color: isDark ? "#9ca3af" : "#6b7280" },
            ]}
          >
            {t("upload.redirectingToResults")}
          </Text>
        </View>
      );
    }

    if (isAnalyzingContract) {
      return <AnalyzingAnimation isVisible={true} progress={uploadProgress} />;
    }

    return (
      <>
        <TouchableOpacity
          style={[
            styles.uploadArea,
            { backgroundColor: isDark ? "#1f2937" : "#ffffff" },
            selectedFile && { borderColor: "#10b981", borderStyle: "solid" }
          ]}
          onPress={handleFileSelect}
          disabled={isAnalyzingContract}
        >
          <View style={styles.uploadIcon}>
            {selectedFile ? (
              <CheckCircle size={48} color="#10b981" />
            ) : (
              <Upload size={48} color={isDark ? "#6b7280" : "#9ca3af"} />
            )}
          </View>

          <Text
            style={[
              styles.uploadTitle,
              { color: isDark ? "#f3f4f6" : "#111827" },
            ]}
          >
            {selectedFile ? t("upload.fileSelected") : t("upload.selectFile")}
          </Text>

          <Text
            style={[
              styles.uploadDescription,
              { color: isDark ? "#9ca3af" : "#6b7280" },
            ]}
          >
            {selectedFile
              ? t("upload.tapToChangeFile")
              : `${t("upload.supportedFormats")}: PDF, DOCX, TXT`
            }
          </Text>

          {selectedFile && (
            <View style={styles.selectedFileInfo}>
              <View style={styles.fileIcon}>
                <FileText size={20} color="#10b981" />
              </View>
              <View style={styles.fileDetails}>
                <Text
                  style={[
                    styles.fileName,
                    { color: isDark ? "#10b981" : "#059669" },
                  ]}
                >
                  {selectedFile.name}
                </Text>
                <Text
                  style={[
                    styles.fileSize,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  {selectedFile.size
                    ? `${Math.round(selectedFile.size / 1024)} KB`
                    : "Unknown size"}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {selectedFile && (
          <TouchableOpacity
            style={[styles.analyzeButton, { backgroundColor: "#10b981" }]}
            onPress={handleAnalyze}
          >
            <Text style={styles.analyzeButtonText}>
              {t("upload.startAnalysis")}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#f9fafb'}
      />


      <View style={styles.header}>
        <TouchableOpacity 
          onPress={isAnalyzingContract ? undefined : onBack} 
          style={[styles.backButton, isAnalyzingContract && { opacity: 0.5 }]}
          disabled={isAnalyzingContract}
        >
          <ArrowLeft size={24} color={isDark ? "#f3f4f6" : "#111827"} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? "#f3f4f6" : "#111827" },
          ]}
        >
          {fromCamera ? t("upload.fromCamera") : t("upload.title")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeTopSpace: {
    height: Platform.OS === 'ios' ? 0 : 0, // Adjust if needed for Android status bar height
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  analyzeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  analyzeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  completionSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  uploadArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    margin: 20,
    minHeight: 200,
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  uploadDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
    width: "100%",
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
  },
});

export default UploadScreen;