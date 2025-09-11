
# Shariaa Contract Analyzer - API Documentation

## Base Configuration
- **Android Emulator**: `http://10.0.2.2:5000`
- **iOS Simulator/Web**: `http://localhost:5000`
- **Production**: Uses the configured API_BASE_URL

## Authentication
All requests require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## 1. Contract Analysis Endpoint

### POST `/analyze`
**Purpose**: Upload and analyze contract documents

**Request Format**:
```javascript
// FormData with file upload
const formData = new FormData();
formData.append('file', {
  uri: fileUri,           // File URI (mobile) or File object (web)
  type: mimeType,         // 'application/pdf', 'image/jpeg', etc.
  name: fileName          // Original filename
});
```

**Supported File Types**:
- PDF documents
- Image files (JPEG, PNG)
- DOCX files
- TXT files

**Response Structure**:
```typescript
interface AnalyzeApiResponse {
  message: string;
  analysis_results: ApiAnalysisTerm[];
  session_id: string;
  original_contract_plain?: string;
  detected_contract_language: 'ar' | 'en';
  original_cloudinary_url?: string;
}

interface ApiAnalysisTerm {
  term_id: string;
  term_text: string;
  is_valid_sharia: boolean;
  sharia_issue?: string;
  reference_number?: string;
  modified_term?: string;
  is_confirmed_by_user?: boolean;
  confirmed_modified_text?: string | null;
  has_expert_feedback?: boolean;
  last_expert_feedback_id?: string | null;
  expert_override_is_valid_sharia?: boolean | null;
}
```

## 2. Session Management

### GET `/session/{sessionId}`
**Purpose**: Retrieve detailed session information

**Response Structure**:
```typescript
interface SessionDetailsApiResponse {
  _id: string;
  session_id: string;
  original_filename: string;
  analysis_timestamp: string;
  analysis_results: ApiAnalysisTerm[];
  compliance_percentage?: number;
  detected_contract_language: 'ar' | 'en';
  original_contract_plain?: string;
  original_format: string;
  original_contract_markdown?: string;
  original_cloudinary_info?: CloudinaryFileInfo;
  analysis_results_cloudinary_info?: CloudinaryFileInfo;
  modified_contract_info?: any;
  marked_contract_info?: any;
  pdf_preview_info?: any;
}
```

### GET `/api/history`
**Purpose**: Get user's contract analysis history

**Response**: Array of `SessionDetailsApiResponse`

## 3. Contract Generation

### POST `/generate_modified_contract`
**Purpose**: Generate a modified version of the contract

**Request**:
```javascript
{
  session_id: string
}
```

**Response**:
```typescript
interface GenerateModifiedContractApiResponse {
  success: boolean;
  message: string;
  modified_docx_cloudinary_url?: string;
  modified_txt_cloudinary_url?: string;
}
```

### POST `/generate_marked_contract`
**Purpose**: Generate a marked version highlighting issues

**Request**:
```javascript
{
  session_id: string
}
```

**Response**:
```typescript
interface GenerateMarkedContractApiResponse {
  success: boolean;
  message: string;
  marked_docx_cloudinary_url?: string;
}
```

## 4. Interactive Features

### POST `/interact`
**Purpose**: Ask questions about contract or specific terms

**Request**:
```javascript
{
  session_id: string;
  question: string;
  term_id?: string;      // Optional, for term-specific questions
  term_text?: string;    // Optional, context for the question
}
```

**Response**: Plain text answer

### POST `/review_modification`
**Purpose**: Get AI review of user modifications

**Request**:
```javascript
{
  session_id: string;
  term_id: string;
  user_modified_text: string;
  original_term_text: string;
}
```

**Response**:
```typescript
interface ReviewModificationApiResponse {
  reviewed_text: string;
  is_still_valid_sharia: boolean;
  new_sharia_issue?: string | null;
  new_reference_number?: string | null;
}
```

### POST `/confirm_modification`
**Purpose**: Confirm and save term modifications

**Request**:
```javascript
{
  session_id: string;
  term_id: string;
  modified_text: string;
}
```

## 5. Expert Feedback

### POST `/feedback/expert`
**Purpose**: Submit expert feedback on AI analysis

**Request**:
```typescript
interface ExpertFeedbackPayload {
  session_id: string;
  term_id: string;
  feedback_data: {
    aiAnalysisApproved: boolean | null;
    expertIsValidSharia?: boolean;
    expertComment: string;
    expertCorrectedShariaIssue?: string;
    expertCorrectedSuggestion?: string;
  };
}
```

## Error Handling
All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 500: Internal Server Error

Error responses include:
```javascript
{
  error: "Error message description"
}
```

## File Storage
- Files are stored on Cloudinary
- URLs are provided in responses for document access
- Local caching is implemented for offline access
