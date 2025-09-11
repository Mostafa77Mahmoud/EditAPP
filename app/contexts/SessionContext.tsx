import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Alert } from "react-native";
import {
  getSessionData,
  storage,
  storageKeys,
  storeSessionData,
} from "../utils/storage";
import * as api from "../services/api";
import type {
  SessionDetailsApiResponse,
  GenerateModifiedContractApiResponse,
  GenerateMarkedContractApiResponse,
  ApiAnalysisTerm,
  ExpertFeedbackPayload,
  CloudinaryFileInfo,
} from "../services/api";

// --- Type Definitions ---
export type UserRole = "regular_user" | "shariah_expert";

export interface SessionInteraction {
  sessionId: string;
  timestamp: string;
  type:
    | "question_asked"
    | "term_modified"
    | "contract_generated"
    | "expert_feedback";
  termId?: string;
  data?: any;
}

export interface FrontendAnalysisTerm extends ApiAnalysisTerm {
  isUserConfirmed?: boolean;
  userModifiedText?: string | null;
  currentQaAnswer?: string | null;
  reviewedSuggestion?: string | null;
  isReviewedSuggestionValid?: boolean | null;
  reviewedSuggestionIssue?: string | null;
  expertFeedbackHistory?: ExpertFeedbackPayload[];
  lastModified?: string;
  interactionCount?: number;
}

export interface SessionDetails extends SessionDetailsApiResponse {
  totalInteractions?: number;
  lastInteractionTime?: string;
  isBookmarked?: boolean;
}

export interface ExtendedSessionDetailsApiResponse
  extends SessionDetailsApiResponse {
  totalInteractions?: number;
  lastInteractionTime?: string;
  isBookmarked?: boolean;
}

interface ComplianceStats {
  totalTerms: number;
  currentUserEffectiveCompliantCount: number;
  currentUserEffectiveNonCompliantCount: number;
  overallCompliancePercentage: number;
  expertReviewedTerms: number;
  userModifiedTerms: number;
}

interface SessionContextType {
  sessionId: string | null;
  analysisTerms: FrontendAnalysisTerm[] | null;
  complianceStats: ComplianceStats | null;
  sessionDetails: SessionDetails | null;
  currentUserRole: UserRole;
  sessionInteractions: SessionInteraction[];
  selectedSessionId: string | null;
  loadSessionData: (sessionId: string) => Promise<void>;
  toggleUserRole: () => void;
  setUserRole: (role: UserRole) => void;
  isUploading: boolean;
  uploadProgress: number;
  analysisProgress: number;
  isAnalyzingContract: boolean;
  setIsAnalyzingContract: React.Dispatch<React.SetStateAction<boolean>>;
  isFetchingSession: boolean;
  isTermProcessing: Record<string, boolean>;
  isGeneratingContract: boolean;
  isGeneratingMarkedContract: boolean;
  contractGenerationProgress: number;
  isAskingQuestion: boolean;
  isReviewingModification: Record<string, boolean>;
  isProcessingGeneralQuestion: boolean;
  error: string | null;
  uploadError: string | null;
  analysisError: string | null;
  uploadAndAnalyzeContract: (file: any) => Promise<string | null>;
  askQuestionAboutTerm: (
    termId: string,
    question: string,
  ) => Promise<string | null>;
  askGeneralContractQuestion: (question: string) => Promise<string | null>;
  reviewUserModification: (
    termId: string,
    userTextToReview: string,
    originalTermText: string,
  ) => Promise<boolean>;
  confirmTermModification: (
    termId: string,
    textToConfirm: string,
  ) => Promise<boolean>;
  generateModifiedContract: () => Promise<GenerateModifiedContractApiResponse | null>;
  generateMarkedContract: () => Promise<GenerateMarkedContractApiResponse | null>;
  submitExpertFeedback: (payload: ExpertFeedbackPayload) => Promise<boolean>;
  loadSessionFromHistory: (session: SessionDetailsApiResponse) => void;
  clearSession: () => void;
  getLocalSessions: () => Promise<SessionDetailsApiResponse[]>;
  deleteLocalSession: (sessionId: string) => Promise<void>;
  updateTermLocally: (
    params: Partial<FrontendAnalysisTerm> & { term_id: string },
  ) => void;
  updatePdfPreviewInfo: (
    type: "modified" | "marked",
    pdfInfo: CloudinaryFileInfo,
  ) => void;
  addInteraction: (
    interaction: Omit<SessionInteraction, "sessionId" | "timestamp">,
  ) => void;
  getSessionInteractions: (sessionId: string) => SessionInteraction[];
  bookmarkSession: (sessionId: string) => void;
  getSessionStats: () => Promise<any>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [analysisTerms, setAnalysisTerms] = useState<
    FrontendAnalysisTerm[] | null
  >(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(
    null,
  );
  const [currentUserRole, setCurrentUserRole] =
    useState<UserRole>("regular_user");
  const [sessionInteractions, setSessionInteractions] = useState<
    SessionInteraction[]
  >([]);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const [isTermProcessing, setIsTermProcessing] = useState<
    Record<string, boolean>
  >({});
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isGeneratingMarkedContract, setIsGeneratingMarkedContract] =
    useState(false);
  const [contractGenerationProgress, setContractGenerationProgress] =
    useState(0);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isReviewingModification, setIsReviewingModification] = useState<
    Record<string, boolean>
  >({});
  const [isProcessingGeneralQuestion, setIsProcessingGeneralQuestion] =
    useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Initialize user role from storage
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const storedRole = await storage.getItemAsync(storageKeys.USER_ROLE);
        if (storedRole) {
          setCurrentUserRole(storedRole as UserRole);
        }
      } catch (error) {
        console.error("Failed to load user role:", error);
      }
    };

    const loadInteractions = async () => {
      try {
        const stored = await storage.getItemAsync(
          storageKeys.SESSION_INTERACTIONS,
        );
        if (stored) {
          setSessionInteractions(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load interactions:", error);
      }
    };

    loadUserRole();
    loadInteractions();
  }, []);

  const setUserRole = useCallback(async (role: UserRole) => {
    try {
      setCurrentUserRole(role);
      await storage.setItemAsync(storageKeys.USER_ROLE, role);
    } catch (error) {
      console.error("Failed to save user role:", error);
    }
  }, []);

  const toggleUserRole = useCallback(() => {
    const newRole =
      currentUserRole === "regular_user" ? "shariah_expert" : "regular_user";
    setUserRole(newRole);
  }, [currentUserRole, setUserRole]);

  const addInteraction = useCallback(
    async (
      interaction: Omit<SessionInteraction, "sessionId" | "timestamp">,
    ) => {
      if (!sessionId) return;

      const newInteraction: SessionInteraction = {
        ...interaction,
        sessionId,
        timestamp: new Date().toISOString(),
      };

      const updatedInteractions = [newInteraction, ...sessionInteractions];
      setSessionInteractions(updatedInteractions);

      try {
        await storage.setItemAsync(
          storageKeys.SESSION_INTERACTIONS,
          JSON.stringify(updatedInteractions),
        );
      } catch (error) {
        console.error("Failed to save interaction:", error);
      }
    },
    [sessionId, sessionInteractions],
  );

  const getSessionInteractions = useCallback(
    (sessionId: string): SessionInteraction[] => {
      return sessionInteractions.filter(
        (interaction) => interaction.sessionId === sessionId,
      );
    },
    [sessionInteractions],
  );

  const getLocalSessions = async (): Promise<SessionDetailsApiResponse[]> => {
    try {
      const storedSessions = await storage.getItemAsync(
        storageKeys.SHARIAA_SESSIONS,
      );
      return storedSessions ? JSON.parse(storedSessions) : [];
    } catch (error) {
      console.error("Failed to get local sessions:", error);
      return [];
    }
  };

  const saveSessionLocally = async (sessionData: SessionDetailsApiResponse) => {
    try {
      const sessions = await getLocalSessions();
      const existingIndex = sessions.findIndex(
        (s) => s.session_id === sessionData.session_id,
      );

      // Fix 1: Add safe checks for possibly undefined arrays
      // Check if analysis_results exists and is an array before mapping
      const analysisResults = Array.isArray(sessionData.analysis_results)
        ? sessionData.analysis_results
        : [];

      // Create optimized session data to reduce storage size
      const optimizedSessionData = {
        _id: sessionData._id,
        session_id: sessionData.session_id,
        original_filename: sessionData.original_filename,
        analysis_timestamp: sessionData.analysis_timestamp,
        compliance_percentage: sessionData.compliance_percentage,
        detected_contract_language: sessionData.detected_contract_language,
        original_format: sessionData.original_format,
        // Fix 1: Safe mapping with proper checks
        analysis_results: analysisResults.map((term) => ({
          term_id: term.term_id,
          is_valid_sharia: term.is_valid_sharia,
          is_confirmed_by_user: term.is_confirmed_by_user,
          has_expert_feedback: term.has_expert_feedback,
          expert_override_is_valid_sharia: term.expert_override_is_valid_sharia,
        })),
        totalInteractions: getSessionInteractions(sessionData.session_id)
          .length,
        lastInteractionTime: new Date().toISOString(),
      };

      let updatedSessions;
      if (existingIndex >= 0) {
        // Update existing session
        updatedSessions = [...sessions];
        updatedSessions[existingIndex] = optimizedSessionData as any;
      } else {
        // Add new session
        updatedSessions = [optimizedSessionData, ...sessions];
      }

      // Keep only the latest 20 sessions to reduce storage
      updatedSessions = updatedSessions.slice(0, 20);

      // Fix 2: Check storage size before saving to avoid SecureStore limit
      const dataToStore = JSON.stringify(updatedSessions);
      if (dataToStore.length > 2000) {
        console.warn(
          "Session data too large for SecureStore, storing minimal data",
        );
        // Store only essential data if too large
        const minimalSessions = updatedSessions.map((session) => ({
          session_id: session.session_id,
          original_filename: session.original_filename,
          analysis_timestamp: session.analysis_timestamp,
          compliance_percentage: session.compliance_percentage,
          totalInteractions:
            "totalInteractions" in session ? session.totalInteractions : 0,
          lastInteractionTime:
            "lastInteractionTime" in session ? session.lastInteractionTime : "",
        }));

        await storage.setItemAsync(
          storageKeys.SHARIAA_SESSIONS,
          JSON.stringify(minimalSessions),
        );
      } else {
        await storage.setItemAsync(storageKeys.SHARIAA_SESSIONS, dataToStore);
      }
    } catch (error) {
      console.error("Failed to save session locally:", error);
    }
  };

  const deleteLocalSession = async (sessionIdToDelete: string) => {
    try {
      const sessions = await getLocalSessions();
      const updatedSessions = sessions.filter(
        (s) => s.session_id !== sessionIdToDelete,
      );
      await storage.setItemAsync(
        storageKeys.SHARIAA_SESSIONS,
        JSON.stringify(updatedSessions),
      );

      // Also remove interactions for this session
      const updatedInteractions = sessionInteractions.filter(
        (i) => i.sessionId !== sessionIdToDelete,
      );
      setSessionInteractions(updatedInteractions);
      await storage.setItemAsync(
        storageKeys.SESSION_INTERACTIONS,
        JSON.stringify(updatedInteractions),
      );
    } catch (error) {
      console.error("Failed to delete local session:", error);
    }
  };

  const bookmarkSession = async (sessionId: string) => {
    try {
      const sessions = await getLocalSessions();
      const updatedSessions = sessions.map((s) => {
        const extendedSession = s as SessionDetails;
        return s.session_id === sessionId
          ? { ...extendedSession, isBookmarked: !extendedSession.isBookmarked }
          : extendedSession;
      });
      await storage.setItemAsync(
        storageKeys.SHARIAA_SESSIONS,
        JSON.stringify(updatedSessions),
      );
    } catch (error) {
      console.error("Failed to bookmark session:", error);
    }
  };

  const clearSession = useCallback(async () => {
    setSessionId(null);
    setAnalysisTerms(null);
    setSessionDetails(null);
    setIsUploading(false);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setIsAnalyzingContract(false);
    setIsFetchingSession(false);
    setIsTermProcessing({});
    setIsGeneratingContract(false);
    setIsGeneratingMarkedContract(false);
    setIsAskingQuestion(false);
    setIsReviewingModification({});
    setIsProcessingGeneralQuestion(false);
    setError(null);
    setUploadError(null);
    setAnalysisError(null);

    // Clear persisted session data
    try {
      await storage.deleteItemAsync(storageKeys.CURRENT_SESSION_ID);
      await storage.deleteItemAsync(storageKeys.CURRENT_ANALYSIS_TERMS);
      await storage.deleteItemAsync(storageKeys.CURRENT_SESSION_DETAILS);
    } catch (error) {
      console.error("Failed to clear persisted session data:", error);
    }
  }, []);

  const loadSessionData = useCallback(
    async (sid: string) => {
      setIsFetchingSession(true);
      setError(null);
      console.log("SessionContext: Loading session data for", sid);

      try {
        // 1. Attempt to load from local storage first
        const localData = await getSessionData(sid);

        if (localData) {
          console.log(`🔌 Hydrating session ${sid} from local storage.`);

          const enrichedTerms = localData.analysis_results.map((term) => ({
            ...term,
            interactionCount: getSessionInteractions(sid).filter(
              (i) => i.termId === term.term_id,
            ).length,
            lastModified: getSessionInteractions(sid)
              .filter(
                (i) => i.termId === term.term_id && i.type === "term_modified",
              )
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )[0]?.timestamp,
          }));

          setSessionId(localData.session_id);
          setSelectedSessionId(localData.session_id);
          setSessionDetails({
            ...localData,
            totalInteractions: getSessionInteractions(sid).length,
            lastInteractionTime: getSessionInteractions(sid)[0]?.timestamp,
          } as SessionDetails);
          setAnalysisTerms(enrichedTerms);
          return;
        }

        // 2. If not found, fetch from the API
        console.log(`☁️ Fetching session ${sid} from API.`);
        const [sessionData, termsData] = await Promise.all([
          api.getSessionDetails(sid),
          api.getSessionTerms(sid),
        ]);

        console.log("SessionContext: Received data", {
          sessionId: sessionData.session_id,
          termsCount: termsData?.length,
          sampleTerm: termsData?.[0],
        });

        const safeTermsData = Array.isArray(termsData) ? termsData : [];

        const enrichedTerms = safeTermsData.map((term) => ({
          ...term,
          interactionCount: getSessionInteractions(sid).filter(
            (i) => i.termId === term.term_id,
          ).length,
          lastModified: getSessionInteractions(sid)
            .filter(
              (i) => i.termId === term.term_id && i.type === "term_modified",
            )
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )[0]?.timestamp,
        }));

        console.log("SessionContext: Setting enriched terms", {
          originalCount: safeTermsData.length,
          enrichedCount: enrichedTerms.length,
          enrichedSample: enrichedTerms[0],
        });

        const fullSessionData = {
          ...sessionData,
          analysis_results: safeTermsData,
        };

        await storeSessionData(fullSessionData);

        setSessionId(sessionData.session_id);
        setSelectedSessionId(sessionData.session_id);
        setSessionDetails({
          ...sessionData,
          totalInteractions: getSessionInteractions(sid).length,
          lastInteractionTime: getSessionInteractions(sid)[0]?.timestamp,
        } as SessionDetails);
        setAnalysisTerms(enrichedTerms);
        await saveSessionLocally(sessionData);
      } catch (err: any) {
        console.error("SessionContext: Error loading session", err);

        let errorMessage = "Failed to load session.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }

        setError(errorMessage);
        Alert.alert("Session Load Error", errorMessage);
        clearSession();
      } finally {
        setIsFetchingSession(false);
      }
    },
    [clearSession, getSessionInteractions],
  );

  const uploadAndAnalyzeContract = async (
    file: any,
  ): Promise<string | null> => {
    clearSession();
    setIsUploading(true);
    setUploadProgress(0);
    setIsAnalyzingContract(true);
    setError(null);
    setUploadError(null);
    setAnalysisError(null);

    try {
      console.log("📤 Starting upload:", {
        name: file.name,
        type: file.type,
        size: file.size,
        hasFile: !!file.file,
        hasImages: !!file.images,
        uri: file.uri ? file.uri.substring(0, 50) + "..." : "none",
      });

      // Validate file before upload
      if (!file || !file.name) {
        throw new Error("Invalid file: missing name");
      }

      if (!file.type) {
        throw new Error("Invalid file: missing type");
      }

      // Import BackgroundTaskManager
      const BackgroundTaskManager = (await import("../services/BackgroundTaskManager")).default;
      const backgroundTaskManager = BackgroundTaskManager.getInstance();

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      try {
        // Try foreground upload first
        const response = await api.uploadContract(file, setUploadProgress);
        await loadSessionData(response.session_id);

        // Add upload interaction
        await addInteraction({
          type: "question_asked",
          data: { action: "contract_uploaded", filename: file.name },
        });

        // Start analysis tracking (both foreground and background)
        const { default: ProcessingService } = await import("../services/ProcessingService");
        const processingService = ProcessingService.getInstance();
        await processingService.startAnalysis(response.session_id);

        // Ensure background processing is active for screen navigation
        console.log('🔄 Background processing active for session:', response.session_id);

        return response.session_id;
      } catch (uploadError) {
        console.log("📤 Foreground upload failed, starting background upload:", uploadError);

        // Start background upload as fallback with proper session ID
        const tempSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await backgroundTaskManager.startBackgroundUpload(tempSessionId, file);

        // Show user that background upload is starting
        Alert.alert(
          "Background Upload Started",
          "Your contract is being uploaded in the background. You'll receive a notification when it's complete."
        );

        return tempSessionId;
      }
    } catch (err: any) {
      // Fix 3: Properly handle error type checking
      let message = "Failed to upload or analyze contract.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }

      console.error("❌ Upload/analysis failed:", message, err);

      // Set appropriate error message
      if (message.includes("400")) {
        setUploadError(
          "Invalid file format. Please check your file and try again.",
        );
      } else if (message.includes("413")) {
        setUploadError("File too large. Please use a smaller file.");
      } else {
        setUploadError(message);
      }

      setAnalysisError(message);
      setError(message);
      Alert.alert("Analysis Error", message);
      return null;
    } finally {
      setIsUploading(false);
      setIsAnalyzingContract(false);
      setUploadProgress(0);
    }
  };

  const updateTermLocally = useCallback(
    (params: Partial<FrontendAnalysisTerm> & { term_id: string }) => {
      setAnalysisTerms((prev) =>
        prev
          ? prev.map((t) =>
              t.term_id === params.term_id
                ? {
                    ...t,
                    ...params,
                    lastModified: new Date().toISOString(),
                    interactionCount: (t.interactionCount || 0) + 1,
                  }
                : t,
            )
          : null,
      );
    },
    [],
  );

  const updatePdfPreviewInfo = useCallback(
    (type: "modified" | "marked", pdfInfo: CloudinaryFileInfo) => {
      setSessionDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pdf_preview_info: {
            ...prev.pdf_preview_info,
            [type]: pdfInfo,
          },
        };
      });
    },
    [],
  );

  const askQuestionAboutTerm = async (
    termId: string,
    question: string,
  ): Promise<string | null> => {
    if (!sessionId || !analysisTerms) return null;
    const term = analysisTerms.find((t) => t.term_id === termId);
    if (!term) return null;

    setIsAskingQuestion(true);
    setIsTermProcessing((prev) => ({ ...prev, [termId]: true }));

    try {
      const answer = await api.askQuestion(
        sessionId,
        question,
        termId,
        term.term_text,
      );

      // Ensure immutable update with proper state management
      setAnalysisTerms((prevTerms) => {
        if (!prevTerms) return null;
        return prevTerms.map((t) =>
          t.term_id === termId
            ? {
                ...t,
                currentQaAnswer: answer,
                lastModified: new Date().toISOString(),
                interactionCount: (t.interactionCount || 0) + 1,
              }
            : t,
        );
      });

      // Add interaction
      await addInteraction({
        type: "question_asked",
        termId,
        data: { question, answer },
      });

      return answer;
    } catch (err: any) {
      console.error("Error asking question about term:", err);

      // Fix 3: Properly handle error type checking
      let errorMessage = "Failed to get answer";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("Interaction Error", errorMessage);
      return null;
    } finally {
      setIsAskingQuestion(false);
      setIsTermProcessing((prev) => ({ ...prev, [termId]: false }));
    }
  };

  const askGeneralContractQuestion = async (
    question: string,
  ): Promise<string | null> => {
    if (!sessionId) return null;
    setIsProcessingGeneralQuestion(true);
    setIsAskingQuestion(true);

    try {
      const answer = await api.askQuestion(sessionId, question);

      // Add interaction
      await addInteraction({
        type: "question_asked",
        data: { question, answer, type: "general" },
      });

      return answer;
    } catch (err: any) {
      // Fix 3: Properly handle error type checking
      let errorMessage = "Failed to get answer";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("Interaction Error", errorMessage);
      return null;
    } finally {
      setIsProcessingGeneralQuestion(false);
      setIsAskingQuestion(false);
    }
  };

  const reviewUserModification = async (
    termId: string,
    userTextToReview: string,
    originalTermText: string,
  ): Promise<boolean> => {
    if (!sessionId) return false;
    setIsReviewingModification((prev) => ({ ...prev, [termId]: true }));

    try {
      const reviewResponse = await api.reviewUserModification(
        sessionId,
        termId,
        userTextToReview,
        originalTermText,
      );
      updateTermLocally({
        term_id: termId,
        userModifiedText: reviewResponse.reviewed_text,
        reviewedSuggestion: reviewResponse.reviewed_text,
        isReviewedSuggestionValid: reviewResponse.is_still_valid_sharia,
        reviewedSuggestionIssue: reviewResponse.new_sharia_issue || null,
        isUserConfirmed: false,
      });

      // Add interaction
      await addInteraction({
        type: "term_modified",
        termId,
        data: {
          originalText: originalTermText,
          reviewedText: reviewResponse.reviewed_text,
          isValid: reviewResponse.is_still_valid_sharia,
        },
      });

      return true;
    } catch (err: any) {
      // Fix 3: Properly handle error type checking
      let errorMessage = "Failed to review modification";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("Review Error", errorMessage);
      return false;
    } finally {
      setIsReviewingModification((prev) => ({ ...prev, [termId]: false }));
    }
  };

  const confirmTermModification = async (
    termId: string,
    textToConfirm: string,
  ): Promise<boolean> => {
    if (!sessionId) return false;
    setIsTermProcessing((prev) => ({ ...prev, [termId]: true }));

    try {
      await api.confirmTermModification(sessionId, termId, textToConfirm);
      updateTermLocally({
        term_id: termId,
        isUserConfirmed: true,
        userModifiedText: textToConfirm,
      });

      // Add interaction
      await addInteraction({
        type: "term_modified",
        termId,
        data: { confirmedText: textToConfirm, action: "confirmed" },
      });

      return true;
    } catch (err: any) {
      // Fix 3: Properly handle error type checking
      let errorMessage = "Failed to confirm modification";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("Confirmation Error", errorMessage);
      return false;
    } finally {
      setIsTermProcessing((prev) => ({ ...prev, [termId]: false }));
    }
  };

  const generateModifiedContract =
    async (): Promise<GenerateModifiedContractApiResponse | null> => {
      if (!sessionId) return null;
      setIsGeneratingContract(true);

      try {
        const response = await api.generateModifiedContract(sessionId);
        if (response.success) {
          // Update session details with contract info
          setSessionDetails((prev) =>
            prev
              ? {
                  ...prev,
                  modified_contract_info: {
                    docx_cloudinary_info: {
                      url: response.modified_docx_cloudinary_url || "",
                      public_id: "",
                      format: "docx",
                      bytes: 0,
                    },
                    pdf_cloudinary_info: response.modified_docx_cloudinary_url
                      ? {
                          url: response.modified_docx_cloudinary_url,
                          public_id: "",
                          format: "pdf",
                          bytes: 0,
                        }
                      : undefined,
                    created_at: new Date().toISOString(),
                  },
                }
              : null,
          );

          // Add interaction
          await addInteraction({
            type: "contract_generated",
            data: { type: "modified", success: true },
          });
        }
        return response;
      } catch (err: any) {
        // Fix 3: Properly handle error type checking
        let errorMessage = "Failed to generate contract";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }

        Alert.alert("Generation Error", errorMessage);
        return null;
      } finally {
        setIsGeneratingContract(false);
      }
    };

  const generateMarkedContract =
    async (): Promise<GenerateMarkedContractApiResponse | null> => {
      if (!sessionId) return null;
      setIsGeneratingMarkedContract(true);

      try {
        const response = await api.generateMarkedContract(sessionId);
        if (response.success) {
          // Update session details with contract info
          setSessionDetails((prev) =>
            prev
              ? {
                  ...prev,
                  marked_contract_info: {
                    docx_cloudinary_info: {
                      url: response.marked_docx_cloudinary_url || "",
                      public_id: "",
                      format: "docx",
                      bytes: 0,
                    },
                    pdf_cloudinary_info: response.marked_docx_cloudinary_url
                      ? {
                          url: response.marked_docx_cloudinary_url,
                          public_id: "",
                          format: "pdf",
                          bytes: 0,
                        }
                      : undefined,
                    created_at: new Date().toISOString(),
                  },
                }
              : null,
          );

          // Add interaction
          await addInteraction({
            type: "contract_generated",
            data: { type: "marked", success: true },
          });
        }
        return response;
      } catch (err: any) {
        // Fix 3: Properly handle error type checking
        let errorMessage = "Failed to generate contract";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }

        Alert.alert("Generation Error", errorMessage);
        return null;
      } finally {
        setIsGeneratingMarkedContract(false);
      }
    };

  const submitExpertFeedback = async (
    payload: ExpertFeedbackPayload,
  ): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      await api.submitExpertFeedback(payload);
      updateTermLocally({
        term_id: payload.term_id,
        has_expert_feedback: true,
        expert_override_is_valid_sharia:
          payload.feedback_data.expertIsValidSharia,
        expertFeedbackHistory: [
          ...(analysisTerms?.find((t) => t.term_id === payload.term_id)
            ?.expertFeedbackHistory || []),
          payload,
        ],
      });

      // Add interaction
      await addInteraction({
        type: "expert_feedback",
        termId: payload.term_id,
        data: payload.feedback_data,
      });

      return true;
    } catch (err: any) {
      // Fix 3: Properly handle error type checking
      let errorMessage = "Failed to submit feedback";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("Feedback Error", errorMessage);
      return false;
    }
  };

  const convertApiTermToFrontend = (
    term: ApiAnalysisTerm,
  ): FrontendAnalysisTerm => ({
    ...term,
    isUserConfirmed: false,
    userModifiedText: null,
    currentQaAnswer: null,
    reviewedSuggestion: null,
    isReviewedSuggestionValid: null,
    reviewedSuggestionIssue: null,
    expertFeedbackHistory: [],
    lastModified: undefined,
    interactionCount: 0,
  });

  const loadSessionFromHistory = useCallback(
    async (sessionData: SessionDetailsApiResponse) => {
      try {
        console.log("📚 Loading session from history:", sessionData.session_id);
        console.log(
          "📚 Session has analysis_results:",
          !!sessionData.analysis_results,
        );
        console.log(
          "📚 Analysis results count:",
          sessionData.analysis_results?.length || 0,
        );

        setSessionId(sessionData.session_id);
        setSessionDetails(sessionData);

        // Store the session data
        await storeSessionData(sessionData);

        // Convert API analysis results to frontend format
        if (
          sessionData.analysis_results &&
          sessionData.analysis_results.length > 0
        ) {
          const convertedTerms = sessionData.analysis_results.map(
            convertApiTermToFrontend,
          );
          setAnalysisTerms(convertedTerms);
          console.log("✅ Converted analysis terms:", convertedTerms.length);
        } else {
          console.warn("⚠️ No analysis results found in session data");
          setAnalysisTerms([]);
        }

        // Store current session information
        await storage.setItemAsync(
          storageKeys.CURRENT_SESSION_ID,
          sessionData.session_id,
        );
        await storage.setItemAsync(
          storageKeys.CURRENT_SESSION_DETAILS,
          JSON.stringify(sessionData),
        );

        console.log("✅ Session loaded from history successfully");
      } catch (error) {
        console.error("❌ Failed to load session from history:", error);
        setError("Failed to load session from history");
      }
    },
    [],
  );

  const getSessionStats = async () => {
    try {
      return await api.getStats();
    } catch (error) {
      console.error("Failed to get session stats:", error);
      return null;
    }
  };

  const complianceStats: ComplianceStats | null = useMemo(() => {
    if (!analysisTerms) return null;

    const totalTerms = analysisTerms.length;
    if (totalTerms === 0) {
      return {
        totalTerms: 0,
        currentUserEffectiveCompliantCount: 0,
        currentUserEffectiveNonCompliantCount: 0,
        overallCompliancePercentage: 0,
        expertReviewedTerms: 0,
        userModifiedTerms: 0,
      };
    }

    const compliantCount = analysisTerms.filter(
      (t) =>
        t.expert_override_is_valid_sharia ??
        (t.isUserConfirmed
          ? (t.isReviewedSuggestionValid ?? true)
          : t.is_valid_sharia),
    ).length;

    const expertReviewedTerms = analysisTerms.filter(
      (t) => t.has_expert_feedback,
    ).length;
    const userModifiedTerms = analysisTerms.filter(
      (t) => t.isUserConfirmed,
    ).length;

    return {
      totalTerms,
      currentUserEffectiveCompliantCount: compliantCount,
      currentUserEffectiveNonCompliantCount: totalTerms - compliantCount,
      overallCompliancePercentage: (compliantCount / totalTerms) * 100,
      expertReviewedTerms,
      userModifiedTerms,
    };
  }, [analysisTerms]);

  // Fix 2: Optimize session data persistence to avoid SecureStore size limits
  useEffect(() => {
    const saveSessionData = async () => {
      if (sessionId && analysisTerms) {
        try {
          // Validate sessionId before storing
          if (
            sessionId &&
            typeof sessionId === "string" &&
            sessionId.trim().length > 0
          ) {
            await storage.setItemAsync(
              storageKeys.CURRENT_SESSION_ID,
              sessionId,
            );
          } else {
            console.warn("Invalid sessionId, skipping storage:", sessionId);
            return;
          }

          // Fix 2: Store only essential data to avoid SecureStore 2048 byte limit
          if (
            analysisTerms &&
            Array.isArray(analysisTerms) &&
            analysisTerms.length > 0
          ) {
            const essentialTerms = analysisTerms.map((term) => ({
              term_id: term.term_id,
              is_valid_sharia: term.is_valid_sharia,
              isUserConfirmed: term.isUserConfirmed,
              userModifiedText: term.userModifiedText,
              isReviewedSuggestionValid: term.isReviewedSuggestionValid,
              lastModified: term.lastModified,
              interactionCount: term.interactionCount,
            }));

            const termsDataString = JSON.stringify(essentialTerms);
            if (termsDataString.length < 2000) {
              await storage.setItemAsync(
                storageKeys.CURRENT_ANALYSIS_TERMS,
                termsDataString,
              );
            } else {
              console.warn(
                "Analysis terms data too large for SecureStore, skipping storage",
              );
            }
          }

          if (sessionDetails && sessionDetails.session_id) {
            // Fix 2: Store only essential session details
            const essentialDetails = {
              session_id: sessionDetails.session_id,
              original_filename: sessionDetails.original_filename,
              analysis_timestamp: sessionDetails.analysis_timestamp,
              compliance_percentage: sessionDetails.compliance_percentage,
              totalInteractions: sessionDetails.totalInteractions,
              lastInteractionTime: sessionDetails.lastInteractionTime,
              isBookmarked: sessionDetails.isBookmarked,
            };

            const detailsDataString = JSON.stringify(essentialDetails);
            if (detailsDataString.length < 2000) {
              await storage.setItemAsync(
                storageKeys.CURRENT_SESSION_DETAILS,
                detailsDataString,
              );
            } else {
              console.warn(
                "Session details data too large for SecureStore, skipping storage",
              );
            }
          }
        } catch (error) {
          console.error("Failed to save session data:", error);
        }
      }
    };

    saveSessionData();
  }, [sessionId, analysisTerms, sessionDetails]);

  // Restore session data on app start
  useEffect(() => {
    const restoreSessionData = async () => {
      try {
        const savedSessionId = await storage.getItemAsync(
          storageKeys.CURRENT_SESSION_ID,
        );
        const savedAnalysisTerms = await storage.getItemAsync(
          storageKeys.CURRENT_ANALYSIS_TERMS,
        );
        const savedSessionDetails = await storage.getItemAsync(
          storageKeys.CURRENT_SESSION_DETAILS,
        );

        if (savedSessionId && savedAnalysisTerms) {
          setSessionId(savedSessionId);
          setAnalysisTerms(JSON.parse(savedAnalysisTerms));
          if (savedSessionDetails) {
            setSessionDetails(JSON.parse(savedSessionDetails));
          }
        }
      } catch (error) {
        console.error("Failed to restore session data:", error);
      }
    };

    restoreSessionData();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        selectedSessionId,
        loadSessionData,
        analysisTerms,
        complianceStats,
        sessionDetails,
        currentUserRole,
        sessionInteractions,
        toggleUserRole,
        setUserRole,
        isUploading,
        uploadProgress,
        analysisProgress,
        isAnalyzingContract,
        setIsAnalyzingContract,
        isFetchingSession,
        isTermProcessing,
        isGeneratingContract,
        isGeneratingMarkedContract,
        contractGenerationProgress,
        isAskingQuestion,
        isReviewingModification,
        isProcessingGeneralQuestion,
        error,
        uploadError,
        analysisError,
        uploadAndAnalyzeContract,
        askQuestionAboutTerm,
        askGeneralContractQuestion,
        reviewUserModification,
        confirmTermModification,
        generateModifiedContract,
        generateMarkedContract,
        submitExpertFeedback,
        loadSessionFromHistory,
        clearSession,
        getLocalSessions,
        deleteLocalSession,
        updateTermLocally,
        updatePdfPreviewInfo,
        addInteraction,
        getSessionInteractions,
        bookmarkSession,
        getSessionStats,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export default useSession;
export { SessionContext, ComplianceStats };