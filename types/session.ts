export interface SessionDetails {
  id: string;
  createdAt: string;
  analysis_results: {
    id: string;
    title: string;
    description: string;
    compliance: number;
  }[];
  original_contract_path?: string;
  offline_analysis?: any;
  restoration?: any;
  fileName?: string;
  complianceScore?: number;
  status?: "completed" | "processing" | "failed";
  pdf_preview_info?: any;
}

export interface LocalContract {
  id: string;
  name: string;
  analysisDate: string;
  complianceScore: number;
  sessionId: string;
  data?: SessionDetails;
  interactions?: number;
  modifications?: number;
  hasGeneratedContract?: boolean;
  fileSize?: string;
  lastViewed?: string;
  isProcessing?: boolean;
}