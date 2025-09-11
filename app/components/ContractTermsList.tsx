import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DimensionValue } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Alert,
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSession, FrontendAnalysisTerm } from "../contexts/SessionContext";
import type {
  GenerateModifiedContractApiResponse,
  GenerateMarkedContractApiResponse,
  CloudinaryFileInfo,
} from "../services/api";
import * as apiService from "../services/api";
import ContractPreviewModal from "./ContractPreviewModal";
import QuestionAnimation from "./QuestionAnimation";
import ComplianceBanner from "./ComplianceBanner";
import {
  CheckCircle,
  Send,
  Loader,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  Edit3,
  XCircle,
  FileWarning,
  FileCheck2,
  FileTextIcon,
  Info,
  HelpCircle,
  RefreshCw,
  Sparkles,
  UserCheck as ExpertIcon,
  Edit,
  FileSearch,
  Eye,
} from "lucide-react-native";
import {
  getSessionDetails,
  askQuestion,
  confirmTermModification,
  reviewUserModification,
  submitExpertFeedback as submitExpertFeedbackAPI,
} from "../services/api";
import { any } from "zod/v4";

interface ExpertFeedbackData {
  aiAnalysisApproved: boolean | null;
  expertIsValidSharia?: boolean;
  expertComment: string;
  expertCorrectedShariaIssue?: string;
  expertCorrectedReference?: string;
  expertCorrectedSuggestion?: string;
}

const GeneratingContractAnimation: React.FC<{
  progress: number;
  type?: "modified" | "marked";
}> = ({ progress, type = "modified" }) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const title =
    type === "marked"
      ? t("term.generatingMarkedContract") || "Generating Marked Contract"
      : t("term.generatingContract") || "Generating Contract";

  const stages = [
    { name: t("generate.stage1") || "Analyzing Terms", threshold: 0 },
    { name: t("generate.stage2") || "Processing Changes", threshold: 30 },
    { name: t("generate.stage3") || "Generating Document", threshold: 60 },
    { name: t("generate.stage4") || "Finalizing", threshold: 90 },
  ];
  const currentStage =
    stages
      .slice()
      .reverse()
      .find((s) => progress >= s.threshold) || stages[0];

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        borderRadius: 24,
        padding: 24,
        margin: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 150,
        minWidth: 300,
        maxWidth: 350,
        alignSelf: "center",
      }}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
            backgroundColor: isDark ? "#374151" : "#f3f4f6",
          }}
        >
          <FileTextIcon size={32} color={isDark ? "#10b981" : "#059669"} />
        </View>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 8,
            textAlign: "center",
            color: isDark ? "#f9fafb" : "#111827",
            writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr" | "auto",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            fontSize: 14,
            marginBottom: 16,
            textAlign: "center",
            color: isDark ? "#9ca3af" : "#6b7280",
            writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr" | "auto",
          }}
        >
          {currentStage.name}
        </Text>

        <View
          style={{
            width: 200,
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 8,
            backgroundColor: isDark ? "#374151" : "#e5e7eb",
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          <View
            style={{
              height: "100%",
              backgroundColor: "#10b981",
              borderRadius: 4,
              width: `${progress}%`,
              alignSelf: "flex-start",
            }}
          />
        </View>

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#10b981",
            textAlign: "center",
          }}
        >
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
};

const ContractTermsList: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const {
    analysisTerms,
    isFetchingSession,
    isTermProcessing,
    isGeneratingContract,
    isGeneratingMarkedContract,
    isProcessingGeneralQuestion,
    isReviewingModification,
    error: sessionError,
    askQuestionAboutTerm,
    askGeneralContractQuestion,
    reviewUserModification,
    confirmTermModification,
    generateModifiedContract,
    generateMarkedContract,
    sessionId,
    sessionDetails,
    updateTermLocally,
    isAnalyzingContract,
    clearSession,
    currentUserRole,
    updatePdfPreviewInfo,
    submitExpertFeedback,
    selectedSessionId,
    loadSessionData,
  } = useSession();

  const isDark = theme === "dark";
  const styles = getStyles(isDark, isRTL);

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>(
    {},
  );
  const [termQuestions, setTermQuestions] = useState<Record<string, string>>(
    {},
  );

  const [generationVisualProgress, setGenerationVisualProgress] = useState(0);
  const [generationType, setGenerationType] = useState<
    "modified" | "marked" | null
  >(null);

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [currentEditText, setCurrentEditText] = useState<string>("");
  const [askingQuestionForTermId, setAskingQuestionForTermId] = useState<
    string | null
  >(null);

  const [isGeneralQuestionModalOpen, setIsGeneralQuestionModalOpen] =
    useState(false);
  const [generalQuestionText, setGeneralQuestionText] = useState("");
  const [generalQuestionAnswerDisplay, setGeneralQuestionAnswerDisplay] =
    useState<string | null>(null);

  const [expertFeedbackTermId, setExpertFeedbackTermId] = useState<
    string | null
  >(null);
  const [currentExpertFeedback, setCurrentExpertFeedback] = useState<
    Partial<ExpertFeedbackData>
  >({});
  const [isSubmittingExpertFeedback, setIsSubmittingExpertFeedback] = useState<
    Record<string, boolean>
  >({});

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFileType, setPreviewFileType] = useState<
    "modified" | "marked" | null
  >(null);

  // Check if any processing is happening for question animation
  const isAnyProcessing = useMemo(() => {
    return (
      isProcessingGeneralQuestion ||
      (askingQuestionForTermId &&
        isTermProcessing?.[askingQuestionForTermId]) ||
      Object.values(isReviewingModification || {}).some(Boolean) ||
      Object.values(isSubmittingExpertFeedback).some(Boolean)
    );
  }, [
    isProcessingGeneralQuestion,
    askingQuestionForTermId,
    isTermProcessing,
    isReviewingModification,
    isSubmittingExpertFeedback,
  ]);

  useEffect(() => {
    if (sessionError) {
      Alert.alert(t("error.generic") || "Error", sessionError);
    }
  }, [sessionError, t]);

  const toggleTerm = useCallback((termId: string) => {
    setExpandedTerms((prev) => {
      const isOpen = !!prev[termId];
      const newState: Record<string, boolean> = {};
      if (!isOpen) {
        newState[termId] = true;
      }
      return newState;
    });
  }, []);

  const handleQuestionChange = useCallback((termId: string, value: string) => {
    setTermQuestions((prev) => ({ ...prev, [termId]: value }));
  }, []);

  const handleSendQuestion = useCallback(
    async (termId: string) => {
      const questionText = termQuestions[termId]?.trim();
      if (!questionText || (isTermProcessing && isTermProcessing[termId]))
        return;
      setAskingQuestionForTermId(termId);
      const answer = await askQuestionAboutTerm(termId, questionText);
      setAskingQuestionForTermId(null);
      if (answer) {
        Alert.alert(
          t("term.answerReceived") || "Answer Received",
          t("term.answerReceivedMessage") || "Your question has been answered.",
        );
      } else {
        Alert.alert(
          t("error.interactionFailed") || "Error",
          "Failed to get an answer to your question.",
        );
      }
    },
    [termQuestions, isTermProcessing, askQuestionAboutTerm, t],
  );

  const handleSendGeneralQuestion = useCallback(async () => {
    if (!generalQuestionText.trim()) return;
    setGeneralQuestionAnswerDisplay(null);
    const answer = await askGeneralContractQuestion(generalQuestionText.trim());
    if (answer) {
      setGeneralQuestionAnswerDisplay(answer);
    } else {
      Alert.alert(
        t("error.interactionFailed") || "Error",
        "Failed to get an answer to your question.",
      );
    }
  }, [generalQuestionText, askGeneralContractQuestion, t]);

  const handleUseAnswerAsSuggestion = useCallback(
    async (term: FrontendAnalysisTerm) => {
      if (term.currentQaAnswer && term.term_text) {
        const success = await reviewUserModification(
          term.term_id,
          term.currentQaAnswer,
          term.term_text,
        );
        if (success) {
          Alert.alert(
            t("review.suggestionReviewed") || "Success",
            t("review.suggestionReviewedDesc") ||
              "Suggestion has been reviewed.",
          );
          if (editingTermId === term.term_id) {
            const updatedTerm = analysisTerms?.find(
              (t_) => t_.term_id === term.term_id,
            );
            setCurrentEditText(
              updatedTerm?.userModifiedText ||
                updatedTerm?.reviewedSuggestion ||
                "",
            );
          }
        } else {
          Alert.alert(
            t("review.reviewFailed") || "Error",
            t("review.reviewFailedDesc") || "Failed to review suggestion.",
          );
        }
      }
    },
    [reviewUserModification, editingTermId, analysisTerms, t],
  );

  const handleSubmitExpertFeedback = useCallback(async () => {
    if (!expertFeedbackTermId || !selectedSessionId) return;

    setIsSubmittingExpertFeedback(prev => ({ ...prev, [expertFeedbackTermId]: true }));

    try {
      const payload = {
        session_id: selectedSessionId,
        term_id: expertFeedbackTermId,
        feedback_data: {
          aiAnalysisApproved: currentExpertFeedback.aiAnalysisApproved ?? null,
          expertIsValidSharia: currentExpertFeedback.expertIsValidSharia ?? false,
          expertComment: currentExpertFeedback.expertComment || '',
          expertCorrectedShariaIssue: currentExpertFeedback.expertCorrectedShariaIssue,
          expertCorrectedReference: currentExpertFeedback.expertCorrectedReference,
          expertCorrectedSuggestion: currentExpertFeedback.expertCorrectedSuggestion
        }
      };

      const success = await submitExpertFeedbackAPI(payload);

      if (success) {
        setExpertFeedbackTermId(null);
        setCurrentExpertFeedback({
          aiAnalysisApproved: null,
          expertIsValidSharia: undefined,
          expertComment: '',
          expertCorrectedShariaIssue: '',
          expertCorrectedReference: '',
          expertCorrectedSuggestion: ''
        });

        // Refresh session data
        if (selectedSessionId) {
          await loadSessionData(selectedSessionId);
        }

        Alert.alert(
          t('expert.feedbackSubmitted') || 'Feedback Submitted',
          t('expert.feedbackSubmittedMessage') || 'Your expert feedback has been submitted successfully.'
        );
      }
    } catch (error) {
      console.error('Error submitting expert feedback:', error);
      Alert.alert(
        t('error.generic') || 'Error',
        t('expert.feedbackError') || 'Failed to submit expert feedback'
      );
    } finally {
      setIsSubmittingExpertFeedback(prev => ({ ...prev, [expertFeedbackTermId]: false }));
    }
  }, [expertFeedbackTermId, selectedSessionId, currentExpertFeedback, submitExpertFeedbackAPI, loadSessionData, t]);

  const handleConfirmChanges = useCallback(
    async (term: FrontendAnalysisTerm) => {
      if (
        (isTermProcessing && isTermProcessing[term.term_id]) ||
        (isReviewingModification && isReviewingModification[term.term_id])
      )
        return;
      const textToConfirm =
        term.userModifiedText ??
        term.reviewedSuggestion ??
        term.modified_term ??
        term.term_text;
      const success = await confirmTermModification(
        term.term_id,
        textToConfirm,
      );
      if (success) {
        Alert.alert(
          t("term.confirmed") || "Confirmed",
          t("term.confirmedMessage") || "Changes have been confirmed.",
        );
        setEditingTermId(null);
      } else {
        Alert.alert(
          t("error.confirmationFailed") || "Error",
          "Failed to confirm changes.",
        );
      }
    },
    [isTermProcessing, isReviewingModification, confirmTermModification, t],
  );

  const handleEditSuggestion = useCallback((term: FrontendAnalysisTerm) => {
    setEditingTermId(term.term_id);
    setCurrentEditText(
      term.isUserConfirmed && term.userModifiedText
        ? term.userModifiedText
        : (term.userModifiedText ??
            term.reviewedSuggestion ??
            term.modified_term ??
            term.term_text),
    );
  }, []);

  const handleSaveAndReviewEditedSuggestion = useCallback(
    async (termId: string) => {
      const term = analysisTerms?.find((t_) => t_.term_id === termId);
      if (!term || !currentEditText.trim()) return;
      const success = await reviewUserModification(
        termId,
        currentEditText,
        term.term_text,
      );
      if (success) {
        setEditingTermId(null);
        Alert.alert(
          t("review.editSentForReview") || "Success",
          t("review.editSentForReviewDesc") ||
            "Your edit has been sent for review.",
        );
      } else {
        Alert.alert(
          t("review.reviewFailed") || "Error",
          t("review.couldNotReviewEdit") || "Could not review your edit.",
        );
      }
    },
    [analysisTerms, currentEditText, reviewUserModification, t],
  );

  const handleStartNewAnalysis = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const runGenerationProcess = async (
    generatorFn: () => Promise<
      | GenerateModifiedContractApiResponse
      | GenerateMarkedContractApiResponse
      | null
    >,
    type: "modified" | "marked",
  ) => {
    setGenerationVisualProgress(0);
    setGenerationType(type);

    const totalVisualDuration = 8 * 1000; // Reduced duration for better UX
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 100 / (totalVisualDuration / 100);
      if (currentProgress >= 95) {
        setGenerationVisualProgress(95);
        clearInterval(progressInterval);
      } else {
        setGenerationVisualProgress(currentProgress);
      }
    }, 100);

    try {
      const response = await generatorFn();
      clearInterval(progressInterval);
      setGenerationVisualProgress(100);

      // Small delay to show completion
      setTimeout(() => {
        setGenerationType(null);
        setGenerationVisualProgress(0);

        if (response && response.success) {
          // Don't reload session data - the generateModifiedContract/generateMarkedContract 
          // functions in SessionContext already update the sessionDetails state
          // This prevents the buttons from disappearing
          
          Alert.alert(
            type === "modified"
              ? t("contract.generated") || "Contract Generated"
              : t("contract.markedGenerated") || "Marked Contract Generated",
            type === "modified"
              ? t("contract.generatedMessage") ||
                  "Your modified contract has been generated successfully."
              : t("contract.markedGeneratedMessage") ||
                  "Your marked contract has been generated successfully.",
          );
        } else {
          Alert.alert(
            t("error.generationFailed") || "Generation Failed",
            response?.message ||
              (type === "modified"
                ? "Could not generate the contract."
                : "Could not generate marked contract."),
          );
        }
      }, 800);
    } catch (error) {
      clearInterval(progressInterval);
      setGenerationType(null);
      setGenerationVisualProgress(0);
      Alert.alert(
        t("error.generationFailed") || "Generation Failed",
        "An error occurred while generating the contract.",
      );
    }
  };

  const handleGenerateContract = useCallback(() => {
    if (isGeneratingContract || isGeneratingMarkedContract) return;
    runGenerationProcess(generateModifiedContract, "modified");
  }, [
    isGeneratingContract,
    isGeneratingMarkedContract,
    generateModifiedContract,
  ]);

  const handleGenerateMarkedContract = useCallback(() => {
    if (isGeneratingContract || isGeneratingMarkedContract) return;
    runGenerationProcess(generateMarkedContract, "marked");
  }, [
    isGeneratingContract,
    isGeneratingMarkedContract,
    generateMarkedContract,
  ]);

  const openPreviewModalWithType = useCallback(
    async (type: "modified" | "marked") => {
      try {
        setPreviewFileType(type);
        setIsPreviewModalOpen(true);
      } catch (error) {
        Alert.alert(
          t("error.generic") || "Error",
          "Failed to open preview modal",
        );
      }
    },
    [t],
  );

  const filteredTerms = useMemo(() => {
    if (!analysisTerms) return [];

    return analysisTerms.filter((term) => {
      if (activeFilter === "all") return true;
      let isEffectivelyCompliant = term.is_valid_sharia;

      if (
        term.expert_override_is_valid_sharia !== null &&
        term.expert_override_is_valid_sharia !== undefined
      ) {
        isEffectivelyCompliant = term.expert_override_is_valid_sharia;
      } else if (term.isUserConfirmed) {
        isEffectivelyCompliant =
          term.isReviewedSuggestionValid !== null && term.isReviewedSuggestionValid !== undefined
            ? term.isReviewedSuggestionValid
            : true;
      } else if (
        term.isReviewedSuggestionValid !== null &&
        term.isReviewedSuggestionValid !== undefined
      ) {
        isEffectivelyCompliant = term.isReviewedSuggestionValid;
      }

      if (activeFilter === "compliant") return isEffectivelyCompliant;
      if (activeFilter === "non-compliant") return !isEffectivelyCompliant;
      return true;
    });
  }, [analysisTerms, activeFilter]);

  if (
    (isFetchingSession || isAnalyzingContract) &&
    (!analysisTerms || analysisTerms.length === 0)
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={isDark ? "#10b981" : "#059669"}
        />
        <Text
          style={[
            styles.loadingText,
            { color: isDark ? "#9ca3af" : "#6b7280" },
          ]}
        >
          {t("loading") || "Loading..."}
        </Text>
      </View>
    );
  }

  if (!sessionId && !isAnalyzingContract) {
    return (
      <View style={styles.emptyContainer}>
        <FileTextIcon size={48} color={isDark ? "#9ca3af" : "#6b7280"} />
        <Text
          style={[styles.emptyText, { color: isDark ? "#9ca3af" : "#6b7280" }]}
        >
          {t("term.noSession") || "No active session"}
        </Text>
      </View>
    );
  }

  if (
    sessionId &&
    analysisTerms === null &&
    !isAnalyzingContract &&
    !isFetchingSession
  ) {
    return (
      <View style={styles.emptyContainer}>
        <FileWarning size={48} color="#f59e0b" />
        <Text
          style={[styles.emptyText, { color: isDark ? "#9ca3af" : "#6b7280" }]}
        >
          {sessionError || t("term.noResults") || "No results found"}
        </Text>
      </View>
    );
  }

  if (
    sessionId &&
    Array.isArray(analysisTerms) &&
    analysisTerms.length === 0 &&
    !isAnalyzingContract &&
    !isFetchingSession
  ) {
    return (
      <View style={styles.emptyContainer}>
        <FileWarning size={48} color="#f59e0b" />
        <Text
          style={[styles.emptyText, { color: isDark ? "#9ca3af" : "#6b7280" }]}
        >
          {t("term.noTermsExtracted") || "No terms extracted"}
        </Text>
      </View>
    );
  }

  if (
    !Array.isArray(analysisTerms) &&
    !isAnalyzingContract &&
    !isFetchingSession &&
    sessionId
  ) {
    console.error(
      "ContractTermsList: analysisTerms is not an array and not loading.",
      analysisTerms,
    );
    return (
      <View style={styles.emptyContainer}>
        <FileWarning size={48} color="#f59e0b" />
        <Text
          style={[styles.emptyText, { color: isDark ? "#9ca3af" : "#6b7280" }]}
        >
          {t("error.generic") || "An error occurred"}
        </Text>
      </View>
    );
  }

  const renderTerm = (term: FrontendAnalysisTerm, index: number) => {
    let isEffectivelyCompliant: boolean = term.is_valid_sharia;

    // Expert override takes highest priority
    if (
      term.expert_override_is_valid_sharia !== null &&
      term.expert_override_is_valid_sharia !== undefined
    ) {
      isEffectivelyCompliant = term.expert_override_is_valid_sharia;
    } 
    // User confirmed terms are always compliant (they've been fixed)
    else if (term.isUserConfirmed) {
      isEffectivelyCompliant = true;
    } 
    // If suggestion has been reviewed but not confirmed yet
    else if (
      term.isReviewedSuggestionValid !== null &&
      term.isReviewedSuggestionValid !== undefined
    ) {
      isEffectivelyCompliant = term.isReviewedSuggestionValid;
    }

    const textInSuggestionOrEditBox =
      editingTermId === term.term_id
        ? currentEditText
        : (term.userModifiedText ??
          term.reviewedSuggestion ??
          term.modified_term ??
          "");

    const isExpanded = expandedTerms[term.term_id] || false;

    return (
      <View key={term.term_id} style={styles.termCard}>
        <TouchableOpacity
          style={styles.termHeader}
          onPress={() => toggleTerm(term.term_id)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.termText, { textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {term.term_text}
          </Text>
          <View style={styles.termHeaderRight}>
            <View
              style={[
                styles.complianceTag,
                {
                  backgroundColor: isEffectivelyCompliant
                    ? "#10b981"
                    : "#ef4444",
                },
              ]}
            >
              <Text style={styles.complianceTagText}>
                {isEffectivelyCompliant
                  ? t("term.compliant") || "Compliant"
                  : t("term.non-compliant") || "Non-Compliant"}
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={isDark ? "#9ca3af" : "#6b7280"}
              style={{
                transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
              }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.termContent}>
            <View style={styles.termDetails}>
              <Text style={styles.sectionTitle}>
                {t("term.fullText") || "Full Text"}
              </Text>
              <Text
                style={[
                  styles.fullText,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {term.term_text}
              </Text>

              {term.is_valid_sharia === false &&
                !term.isUserConfirmed &&
                term.sharia_issue && (
                  <View style={styles.issueContainer}>
                    <View style={styles.issueHeader}>
                      <AlertCircle size={15} color="#dc2626" />
                      <Text style={styles.issueTitle}>
                        {t("term.why") || "Why Non-Compliant"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.issueText,
                        { textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {term.sharia_issue}
                    </Text>
                  </View>
                )}

              {term.reference_number && (
                <View
                  style={[
                    styles.referenceContainer,
                    {
                      backgroundColor: isEffectivelyCompliant
                        ? "#dbeafe"
                        : "#fef3c7",
                      borderLeftColor: isEffectivelyCompliant
                        ? "#3b82f6"
                        : "#f59e0b",
                    },
                  ]}
                >
                  <View style={styles.referenceHeader}>
                    <Info
                      size={15}
                      color={isEffectivelyCompliant ? "#1d4ed8" : "#d97706"}
                    />
                    <Text
                      style={[
                        styles.referenceTitle,
                        {
                          color: isEffectivelyCompliant ? "#1d4ed8" : "#d97706",
                        },
                      ]}
                    >
                      {t("term.reference") || "Reference"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.referenceText,
                      {
                        color: isEffectivelyCompliant ? "#1e40af" : "#b45309",
                        textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {term.reference_number}
                  </Text>
                </View>
              )}
            </View>

            {/* Expert Feedback Section - Only show for expert users */}
            {currentUserRole === "shariah_expert" && (
              <View style={styles.expertFeedbackSection}>
                <TouchableOpacity
                  style={styles.expertFeedbackButton}
                  onPress={() => setExpertFeedbackTermId(term.term_id)}
                >
                  <ExpertIcon size={16} color="#f59e0b" />
                  <Text style={styles.expertFeedbackButtonText}>
                    {t("expert.provideFeedback") || "Provide Expert Feedback"}
                  </Text>
                </TouchableOpacity>
                {term.has_expert_feedback && (
                  <View style={styles.expertFeedbackIndicator}>
                    <ExpertIcon size={14} color="#10b981" />
                    <Text style={styles.expertFeedbackIndicatorText}>
                      {t("expert.feedbackProvided") ||
                        "Expert feedback provided"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.suggestionSection}>
              {editingTermId === term.term_id ? (
                <View style={styles.editContainer}>
                  <Text style={styles.sectionTitle}>
                    {t("term.editSuggestion") || "Edit Suggestion"}
                  </Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      { textAlign: isRTL ? "right" : "left" },
                    ]}
                    value={currentEditText}
                    onChangeText={setCurrentEditText}
                    multiline
                    placeholder={
                      t("term.editSuggestion") || "Edit suggestion..."
                    }
                    placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setEditingTermId(null)}
                    >
                      <XCircle
                        size={16}
                        color={isDark ? "#9ca3af" : "#6b7280"}
                      />
                      <Text style={styles.cancelButtonText}>
                        {t("term.cancel") || "Cancel"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() =>
                        handleSaveAndReviewEditedSuggestion(term.term_id)
                      }
                      disabled={
                        isReviewingModification &&
                        isReviewingModification[term.term_id]
                      }
                    >
                      {isReviewingModification &&
                      isReviewingModification[term.term_id] ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Sparkles size={16} color="#ffffff" />
                      )}
                      <Text style={styles.saveButtonText}>
                        {isReviewingModification &&
                        isReviewingModification[term.term_id]
                          ? t("processing") || "Processing..."
                          : t("term.saveAndReview") || "Save & Review"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : term.isUserConfirmed && term.userModifiedText ? (
                <View style={styles.confirmedContainer}>
                  <Text style={styles.sectionTitle}>
                    {t("term.confirmed") || "Confirmed"}
                  </Text>
                  <View style={styles.confirmedTextContainer}>
                    <Text
                      style={[
                        styles.confirmedText,
                        { textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {term.userModifiedText}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editConfirmedButton}
                    onPress={() => handleEditSuggestion(term)}
                  >
                    <Edit3 size={14} color={isDark ? "#10b981" : "#059669"} />
                    <Text style={styles.editConfirmedButtonText}>
                      {t("term.editConfirmed") || "Edit Confirmed"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : textInSuggestionOrEditBox &&
                (!term.is_valid_sharia ||
                  term.userModifiedText ||
                  term.reviewedSuggestion) ? (
                <View style={styles.suggestionContainer}>
                  <Text style={styles.sectionTitle}>
                    {t("term.initialSuggestion") || "Suggestion"}
                  </Text>
                  <View style={styles.suggestionTextContainer}>
                    <Text
                      style={[
                        styles.suggestionText,
                        { textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {textInSuggestionOrEditBox}
                    </Text>
                  </View>
                  <View style={styles.suggestionButtons}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => handleConfirmChanges(term)}
                      disabled={
                        (isTermProcessing && isTermProcessing[term.term_id]) ||
                        (isReviewingModification &&
                          isReviewingModification[term.term_id])
                      }
                    >
                      {isTermProcessing && isTermProcessing[term.term_id] ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThumbsUp size={16} color="#ffffff" />
                      )}
                      <Text style={styles.confirmButtonText}>
                        {isTermProcessing && isTermProcessing[term.term_id]
                          ? t("processing") || "Processing..."
                          : t("button.confirm") || "Confirm"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditSuggestion(term)}
                      disabled={
                        (isTermProcessing && isTermProcessing[term.term_id]) ||
                        (isReviewingModification &&
                          isReviewingModification[term.term_id])
                      }
                    >
                      <Edit3 size={16} color={isDark ? "#10b981" : "#059669"} />
                      <Text style={styles.editButtonText}>
                        {t("term.editSuggestion") || "Edit"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : term.is_valid_sharia ? (
                <View style={styles.compliantContainer}>
                  <Text
                    style={[
                      styles.compliantText,
                      { textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("term.alreadyCompliant") ||
                      "This term is already compliant with Sharia law."}
                  </Text>
                </View>
              ) : null}

              {!term.isUserConfirmed && (
                <View style={styles.questionSection}>
                  <TouchableOpacity
                    style={styles.questionToggle}
                    onPress={() =>
                      setAskingQuestionForTermId(
                        askingQuestionForTermId === term.term_id
                          ? null
                          : term.term_id,
                      )
                    }
                  >
                    <MessageSquare size={16} color="#3b82f6" />
                    <Text style={styles.questionToggleText}>
                      {t("term.askQuestion") || "Ask Question"}
                    </Text>
                    <ChevronDown
                      size={16}
                      color="#3b82f6"
                      style={{
                        transform: [
                          {
                            rotate:
                              askingQuestionForTermId === term.term_id
                                ? "180deg"
                                : "0deg",
                          },
                        ],
                        marginLeft: "auto",
                      }}
                    />
                  </TouchableOpacity>

                  {askingQuestionForTermId === term.term_id && (
                    <View style={styles.questionInput}>
                      <TextInput
                        style={[
                          styles.questionTextInput,
                          { textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={
                          t("term.questionPlaceholder") ||
                          "Ask a question about this term..."
                        }
                        placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                        value={termQuestions[term.term_id] || ""}
                        onChangeText={(text) =>
                          handleQuestionChange(term.term_id, text)
                        }
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => handleSendQuestion(term.term_id)}
                        disabled={
                          (isTermProcessing &&
                            isTermProcessing[term.term_id]) ||
                          !termQuestions[term.term_id]?.trim()
                        }
                      >
                        {isTermProcessing && isTermProcessing[term.term_id] ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Send size={16} color="#ffffff" />
                        )}
                        <Text style={styles.sendButtonText}>
                          {t("button.send") || "Send"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Display the current Q&A answer for this term */}
                  {term.currentQaAnswer && (
                    <View style={styles.termAnswerContainer}>
                      <Text style={styles.termAnswerTitle}>
                        {t("term.answer") || "Answer"}
                      </Text>
                      <Text
                        style={[
                          styles.termAnswerText,
                          { textAlign: isRTL ? "right" : "left" },
                        ]}
                      >
                        {term.currentQaAnswer}
                      </Text>
                      {term.currentQaAnswer && !term.userModifiedText && !term.reviewedSuggestion && (
                        <TouchableOpacity
                          style={styles.useAnswerButton}
                          onPress={() => handleUseAnswerAsSuggestion(term)}
                          disabled={
                            isReviewingModification &&
                            isReviewingModification[term.term_id]
                          }
                        >
                          {isReviewingModification &&
                          isReviewingModification[term.term_id] ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <CheckCircle size={16} color="#ffffff" />
                          )}
                          <Text style={styles.useAnswerButtonText}>
                            {isReviewingModification &&
                            isReviewingModification[term.term_id]
                              ? t("processing") || "Processing..."
                              : t("button.useAndReview") || "Use as Suggestion & Review"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };



  return (
    <View style={styles.container}>
      {/* Question Animation Overlay */}
      {isAnyProcessing && <QuestionAnimation isVisible={true} />}

      {/* Generation Animation Overlay */}
      {(isGeneratingContract || isGeneratingMarkedContract) &&
        generationType && (
          <Modal transparent visible animationType="fade">
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <GeneratingContractAnimation
                progress={generationVisualProgress}
                type={generationType}
              />
            </View>
          </Modal>
        )}

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Compliance Banner */}
        <ComplianceBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("contract.terms") || "Contract Terms Analysis"}
          </Text>
          {sessionId &&
            Array.isArray(analysisTerms) &&
            analysisTerms.length > 0 && (
              <TouchableOpacity
                style={styles.generalQuestionButton}
                onPress={() => setIsGeneralQuestionModalOpen(true)}
              >
                <HelpCircle size={16} color={isDark ? "#10b981" : "#059669"} />
                <Text style={styles.generalQuestionButtonText}>
                  {t("term.askGeneralQuestion") || "Ask General Question"}
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {["all", "compliant", "non-compliant"].map((filterValue) => (
            <TouchableOpacity
              key={filterValue}
              style={[
                styles.filterTab,
                activeFilter === filterValue && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filterValue)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filterValue && styles.filterTabTextActive,
                ]}
              >
                {t('filter.' + filterValue) || filterValue}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms List */}
        {Array.isArray(analysisTerms) && filteredTerms.length > 0 ? (
          <View style={styles.termsList}>
            {filteredTerms.map((term, index) => renderTerm(term, index))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? "#9ca3af" : "#6b7280" },
              ]}
            >
              {t("term.noTermsForFilter") ||
                "No terms match the selected filter."}
            </Text>
          </View>
        )}

        {/* Contract Generation Section */}
        {Array.isArray(analysisTerms) && analysisTerms.length > 0 && (
          <View style={styles.generationSection}>
            <Text style={styles.generationTitle}>
              {t("contract.reviewContract") || "Review Contract"}
            </Text>
            <Text style={styles.generationSubtitle}>
              {t("contract.generateInfo") ||
                "Generate your modified or marked contract"}
            </Text>

            <View style={styles.generationButtons}>
              <TouchableOpacity
                style={[styles.generateButton, styles.generateModifiedButton]}
                onPress={handleGenerateContract}
                disabled={
                  isGeneratingContract ||
                  isGeneratingMarkedContract ||
                  isFetchingSession ||
                  isAnalyzingContract
                }
              >
                {isGeneratingContract ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <FileCheck2 size={16} color="#ffffff" />
                )}
                <Text style={styles.generateButtonText}>
                  {isGeneratingContract
                    ? t("processing") || "Processing..."
                    : t("contract.generateButton") ||
                      "Generate Modified Contract"}
                </Text>
              </TouchableOpacity>

              {(sessionDetails?.modified_contract_info?.docx_cloudinary_info?.url ||
                sessionDetails?.modified_contract_info?.pdf_cloudinary_info?.url) && (
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => openPreviewModalWithType("modified")}
                  >
                    <Eye size={16} color={isDark ? "#10b981" : "#059669"} />
                    <Text style={styles.previewButtonText}>
                      {t("contract.preview.modifiedTitle") ||
                        "Preview Modified Contract"}
                    </Text>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={[styles.generateButton, styles.generateMarkedButton]}
                onPress={handleGenerateMarkedContract}
                disabled={
                  isGeneratingContract ||
                  isGeneratingMarkedContract ||
                  isFetchingSession ||
                  isAnalyzingContract
                }
              >
                {isGeneratingMarkedContract ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <FileSearch size={16} color="#ffffff" />
                )}
                <Text style={styles.generateButtonText}>
                  {isGeneratingMarkedContract
                    ? t("processing") || "Processing..."
                    : t("contract.generateMarkedButton") ||
                      "Generate Marked Contract"}
                </Text>
              </TouchableOpacity>

              {(sessionDetails?.marked_contract_info?.docx_cloudinary_info?.url ||
                sessionDetails?.marked_contract_info?.pdf_cloudinary_info?.url) && (
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => openPreviewModalWithType("marked")}
                  >
                    <Eye size={16} color="#3b82f6" />
                    <Text style={styles.previewButtonText}>
                      {t("contract.preview.markedTitle") ||
                        "Preview Marked Contract"}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            {sessionId && (
              <TouchableOpacity
                style={styles.newAnalysisButton}
                onPress={handleStartNewAnalysis}
              >
                <RefreshCw size={16} color="#ef4444" />
                <Text style={styles.newAnalysisButtonText}>
                  {t("upload.newAnalysis") || "Start New Analysis"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* General Question Modal */}
      <Modal
        visible={isGeneralQuestionModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsGeneralQuestionModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("term.askGeneralQuestion") || "Ask General Question"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setIsGeneralQuestionModalOpen(false);
                setGeneralQuestionText("");
                setGeneralQuestionAnswerDisplay(null);
              }}
            >
              <XCircle size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={[
                styles.generalQuestionInput,
                { textAlign: isRTL ? "right" : "left" },
              ]}
              placeholder={
                t("term.generalQuestionPlaceholder") ||
                "Ask a general question about the contract..."
              }
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              value={generalQuestionText}
              onChangeText={setGeneralQuestionText}
              multiline
            />

            {isProcessingGeneralQuestion && (
              <View style={styles.processingContainer}>
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#10b981" : "#059669"}
                />
                <Text style={styles.processingText}>
                  {t("processing") || "Processing..."}
                </Text>
              </View>
            )}

            {generalQuestionAnswerDisplay && !isProcessingGeneralQuestion && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerTitle}>
                  {t("term.answer") || "Answer"}
                </Text>
                <Text
                  style={[
                    styles.answerText,
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {generalQuestionAnswerDisplay}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setIsGeneralQuestionModalOpen(false);
                setGeneralQuestionAnswerDisplay(null);
                setGeneralQuestionText("");
              }}
            >
              <Text style={styles.modalCancelButtonText}>
                {t("term.cancel") || "Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSendButton}
              onPress={handleSendGeneralQuestion}
              disabled={
                isProcessingGeneralQuestion || !generalQuestionText.trim()
              }
            >
              {isProcessingGeneralQuestion ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={16} color="#ffffff" />
              )}
              <Text style={styles.modalSendButtonText}>
                {t("button.send") || "Send"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Expert Feedback Modal */}
      {expertFeedbackTermId && currentUserRole === 'shariah_expert' && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setExpertFeedbackTermId(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('expert.provideFeedback') || 'Provide Expert Feedback'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setExpertFeedbackTermId(null);
                  setCurrentExpertFeedback({});
                }}
              >
                <XCircle size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.expertFeedbackForm}>
                <Text style={styles.feedbackLabel}>
                  {t('expert.aiAnalysisApproval') || 'Do you approve the AI analysis?'}
                </Text>
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.approvalButton,
                      currentExpertFeedback.aiAnalysisApproved === true && styles.approvalButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentExpertFeedback(prev => ({ ...prev, aiAnalysisApproved: true }))
                    }
                  >
                    <Text style={styles.approvalButtonText}>
                      {t('expert.approve') || 'Approve'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.approvalButton,
                      currentExpertFeedback.aiAnalysisApproved === false && styles.approvalButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentExpertFeedback(prev => ({ ...prev, aiAnalysisApproved: false }))
                    }
                  >
                    <Text style={styles.approvalButtonText}>
                      {t('expert.reject') || 'Reject'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.feedbackLabel}>
                  {t('expert.isValidSharia') || 'Is this term Sharia compliant?'}
                </Text>
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.approvalButton,
                      currentExpertFeedback.expertIsValidSharia === true && styles.approvalButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentExpertFeedback(prev => ({ ...prev, expertIsValidSharia: true }))
                    }
                  >
                    <Text style={styles.approvalButtonText}>
                      {t('expert.compliant') || 'Compliant'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.approvalButton,
                      currentExpertFeedback.expertIsValidSharia === false && styles.approvalButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentExpertFeedback(prev => ({ ...prev, expertIsValidSharia: false }))
                    }
                  >
                    <Text style={styles.approvalButtonText}>
                      {t('expert.nonCompliant') || 'Non-Compliant'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.feedbackLabel}>
                  {t('expert.comment') || 'Expert Comment'}
                </Text>
                <TextInput
                  style={[styles.feedbackInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('expert.commentPlaceholder') || 'Provide your expert comment...'}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={currentExpertFeedback.expertComment || ''}
                  onChangeText={(text) =>
                    setCurrentExpertFeedback(prev => ({ ...prev, expertComment: text }))
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setExpertFeedbackTermId(null);
                  setCurrentExpertFeedback({});
                }}
              >
                <Text style={styles.modalCancelButtonText}>
                  {t('term.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSendButton}
                onPress={handleSubmitExpertFeedback}
                disabled={
                  isSubmittingExpertFeedback[expertFeedbackTermId] ||
                  !currentExpertFeedback.expertComment?.trim()
                }
              >
                {isSubmittingExpertFeedback[expertFeedbackTermId] ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={16} color="#ffffff" />
                )}
                <Text style={styles.modalSendButtonText}>
                  {isSubmittingExpertFeedback[expertFeedbackTermId]
                    ? t('processing') || 'Processing...'
                    : t('expert.submitFeedback') || 'Submit Feedback'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Contract Preview Modal */}
      <ContractPreviewModal
        isVisible={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewFileType(null);
        }}
        fileType={previewFileType}
      />
    </View>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#ffffff",
    },
    mainScrollView: {
      flex: 1,
    },
    scrollContainer: {
      paddingBottom: 20,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
    },
    generatingModal: {
      borderRadius: 24,
      padding: 24,
      margin: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
    },
    generatingContent: {
      alignItems: "center",
    },
    generatingIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    generatingTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
      textAlign: "center",
    },
    generatingStage: {
      fontSize: 14,
      marginBottom: 16,
      textAlign: "center",
    },
    progressBar: {
      width: 200,
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#10b981",
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#10b981",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
      minHeight: 200,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      textAlign: "center",
    },
    header: {
      flexDirection: isRTL ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      paddingBottom: 8,
      backgroundColor: isDark ? "#111827" : "#ffffff",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: isDark ? "#f9fafb" : "#111827",
    },
    generalQuestionButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: isDark ? "#10b981" : "#059669",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    generalQuestionButtonText: {
      color: isDark ? "#10b981" : "#059669",
      fontSize: 14,
      fontWeight: "500",
    },
    filterTabs: {
      flexDirection: "row",
      backgroundColor: isDark ? "#374151" : "#f3f4f6",
      borderRadius: 8,
      margin: 16,
      marginTop: 8,
      padding: 4,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    filterTabActive: {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: "500",
      color: isDark ? "#9ca3af" : "#6b7280",
    },
    filterTabTextActive: {
      color: isDark ? "#f9fafb" : "#111827",
    },
    termsList: {
      padding: 16,
      paddingTop: 0,
      gap: 16,
    },
    termCard: {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#374151" : "#e5e7eb",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 8,
    },
    termHeader: {
      flexDirection: isRTL ? "row-reverse" : "row",
      padding: 16,
      alignItems: "flex-start",
      gap: 12,
    },
    termText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#f9fafb" : "#111827",
      lineHeight: 24,
    },
    termHeaderRight: {
      alignItems: "flex-end",
      gap: 8,
    },
    complianceTag: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    complianceTagText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "bold",
    },
    termContent: {
      borderTopWidth: 1,
      borderTopColor: isDark ? "#374151" : "#e5e7eb",
      padding: 16,
      gap: 16,
    },
    termDetails: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: isDark ? "#9ca3af" : "#6b7280",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    fullText: {
      fontSize: 16,
      color: isDark ? "#f9fafb" : "#111827",
      lineHeight: 24,
    },
    issueContainer: {
      backgroundColor: isDark ? "#7f1d1d" : "#fee2e2",
      borderLeftWidth: 4,
      borderLeftColor: "#dc2626",
      borderRadius: 8,
      padding: 14,
    },
    issueHeader: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    issueTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#fca5a5" : "#dc2626",
    },
    issueText: {
      fontSize: 14,
      color: isDark ? "#fecaca" : "#b91c1c",
      lineHeight: 20,
    },
    referenceContainer: {
      borderLeftWidth: 4,
      borderRadius: 8,
      padding: 14,
    },
    referenceHeader: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    referenceTitle: {
      fontSize: 12,
      fontWeight: "600",
    },
    referenceText: {
      fontSize: 14,
      lineHeight: 20,
    },
    suggestionSection: {
      gap: 12,
    },
    editContainer: {
      gap: 8,
    },
    editInput: {
      backgroundColor: isDark ? "#374151" : "#f9fafb",
      borderWidth: 1,
      borderColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 120,
      color: isDark ? "#f9fafb" : "#111827",
    },
    editButtons: {
      flexDirection: isRTL ? "row-reverse" : "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    cancelButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 6,
    },
    cancelButtonText: {
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: 14,
      fontWeight: "500",
    },
    saveButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#10b981",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 6,
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    confirmedContainer: {
      gap: 8,
    },
    confirmedTextContainer: {
      backgroundColor: isDark ? "#064e3b" : "#d1fae5",
      borderWidth: 1,
      borderColor: isDark ? "#059669" : "#10b981",
      borderRadius: 8,
      padding: 14,
    },
    confirmedText: {
      fontSize: 16,
      color: isDark ? "#a7f3d0" : "#059669",
      lineHeight: 24,
      fontWeight: "500",
    },
    editConfirmedButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: isDark ? "#10b981" : "#059669",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 6,
      alignSelf: "flex-start",
    },
    editConfirmedButtonText: {
      color: isDark ? "#10b981" : "#059669",
      fontSize: 12,
      fontWeight: "500",
    },
    suggestionContainer: {
      gap: 8,
    },
    suggestionTextContainer: {
      backgroundColor: isDark ? "#1e3a8a" : "#dbeafe",
      borderWidth: 1,
      borderColor: isDark ? "#3b82f6" : "#60a5fa",
      borderRadius: 8,
      padding: 14,
    },
    suggestionText: {
      fontSize: 16,
      color: isDark ? "#93c5fd" : "#1e40af",
      lineHeight: 24,
    },
    suggestionButtons: {
      flexDirection: isRTL ? "row-reverse" : "row",
      gap: 8,
    },
    confirmButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#10b981",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
      flex: 1,
      justifyContent: "center",
    },
    confirmButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    editButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: isDark ? "#10b981" : "#059669",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
      flex: 1,
      justifyContent: "center",
    },
    editButtonText: {
      color: isDark ? "#10bb981" : "#059669",
      fontSize: 14,
      fontWeight: "600",
    },
    compliantContainer: {
      backgroundColor: isDark ? "#064e3b" : "#d1fae5",
      borderWidth: 1,
      borderColor: isDark ? "#059669" : "#10b981",
      borderRadius: 8,
      padding: 14,
    },
    compliantText: {
      fontSize: 16,
      color: isDark ? "#a7f3d0" : "#059669",
      lineHeight: 24,
    },
    questionSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? "#374151" : "#e5e7eb",
      paddingTop: 12,
      gap: 8,
    },
    questionToggle: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingVertical: 8,
      gap: 8,
    },
    questionToggleText: {
      fontSize: 14,
      color: "#3b82f6",
      fontWeight: "500",
    },
    questionInput: {
      gap: 8,
      paddingLeft: isRTL ? 0 : 8,
      paddingRight: isRTL ? 8 : 0,
    },
    questionTextInput: {
      backgroundColor: isDark ? "#374151" : "#f9fafb",
      borderWidth: 1,
      borderColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 100,
      color: isDark ? "#f9fafb" : "#111827",
    },
    sendButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#3b82f6",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      justifyContent: "center",
    },
    sendButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    generationSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? "#374151" : "#e5e7eb",
      padding: 16,
      margin: 16,
      marginBottom: 0,
      gap: 16,
    },
    generationTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#f9fafb" : "#111827",
    },
    generationSubtitle: {
      fontSize: 14,
      color: isDark ? "#9ca3af" : "#6b7280",
      lineHeight: 20,
    },
    generationButtons: {
      gap: 12,
    },
    generateButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 8,
      justifyContent: "center",
    },
    generateModifiedButton: {
      backgroundColor: "#10b981",
    },
    generateMarkedButton: {
      backgroundColor: "#3b82f6",
    },
    generateButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    previewButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: isDark ? "#10b981" : "#059669",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      justifyContent: "center",
    },
    previewButtonText: {
      color: isDark ? "#10b981" : "#059669",
      fontSize: 14,
      fontWeight: "600",
    },
    newAnalysisButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#ef4444",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      justifyContent: "center",
    },
    newAnalysisButtonText: {
      color: "#ef4444",
      fontSize: 16,
      fontWeight: "600",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#ffffff",
    },
    modalHeader: {
      flexDirection: isRTL ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#374151" : "#e5e7eb",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#f9fafb" : "#111827",
    },
    modalCloseButton: {
      padding: 8,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    generalQuestionInput: {
      backgroundColor: isDark ? "#374151" : "#f9fafb",
      borderWidth: 1,
      borderColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 120,
      color: isDark ? "#f9fafb" : "#111827",
      marginBottom: 16,
    },
    processingContainer: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      gap: 8,
    },
    processingText: {
      fontSize: 14,
      color: isDark ? "#9ca3af" : "#6b7280",
    },
    answerContainer: {
      backgroundColor: isDark ? "#1e3a8a" : "#dbeafe",
      borderRadius: 8,
      padding: 14,
      marginTop: 12,
    },
    answerTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: isDark ? "#93c5fd" : "#1e40af",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    answerText: {
      fontSize: 16,
      color: isDark ? "#93c5fd" : "#1e40af",
      lineHeight: 24,
    },
    modalFooter: {
      flexDirection: isRTL ? "row-reverse" : "row",
      justifyContent: "flex-end",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? "#374151" : "#e5e7eb",
      gap: 12,
    },
    modalCancelButton: {
      backgroundColor: "transparent",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
    },
    modalCancelButtonText: {
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: 16,
      fontWeight: "500",
    },
    modalSendButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#3b82f6",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      gap: 6,
    },
    modalSendButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    termAnswerContainer: {
      backgroundColor: isDark ? "#1e3a8a" : "#dbeafe",
      borderRadius: 8,
      padding: 14,
      marginTop: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#3b82f6",
    },
    termAnswerTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: isDark ? "#93c5fd" : "#1e40af",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    termAnswerText: {
      fontSize: 16,
      color: isDark ? "#93c5fd" : "#1e40af",
      lineHeight: 24,
      marginBottom: 12,
    },
    useAnswerButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#3b82f6",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 6,
      alignSelf: "flex-start",
    },
    useAnswerButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    expertFeedbackSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? "#374151" : "#e5e7eb",
      paddingTop: 12,
      gap: 8,
    },
    expertFeedbackButton: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#f59e0b",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    expertFeedbackButtonText: {
      color: "#f59e0b",
      fontSize: 14,
      fontWeight: "500",
    },
    expertFeedbackIndicator: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: isDark ? "#064e3b" : "#d1fae5",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    expertFeedbackIndicatorText: {
      color: isDark ? "#a7f3d0" : "#059669",
      fontSize: 12,
      fontWeight: "500",
    },
    expertFeedbackForm: {
      gap: 16,
    },
    feedbackLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#f9fafb" : "#111827",
      marginBottom: 8,
    },
    approvalButtons: {
      flexDirection: isRTL ? "row-reverse" : "row",
      gap: 12,
      marginBottom: 16,
    },
    approvalButton: {
      flex: 1,
      backgroundColor: isDark ? "#374151" : "#f3f4f6",
      borderWidth: 1,
      borderColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    approvalButtonActive: {
      backgroundColor: "#f59e0b",
      borderColor: "#f59e0b",
    },
    approvalButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#f9fafb" : "#111827",
    },
    feedbackInput: {
      backgroundColor: isDark ? "#374151" : "#f9fafb",
      borderWidth: 1,
      borderColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 100,
      color: isDark ? "#f9fafb" : "#111827",
      marginBottom: 16,
    },
  });

export default ContractTermsList;