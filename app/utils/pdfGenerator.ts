// --- START OF FILE pdfGenerator.ts ---

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// FIX: Removed unused imports for PDFViewer and generatePDF from api.ts.

// --- TYPE DEFINITION (INTEGRATED) ---
// This type is based on your SessionContext to avoid incorrect imports.
export interface EnrichedTerm {
  _id: string;
  term_id: string;
  term_text: string;
  sharia_issue: string | null;
  is_valid_sharia: boolean;
  modified_term: string | null;
  reference_number: string | null;
  session_id: string;
  // Fields added on the client
  interactionCount?: number;
  lastModified?: string;
}

// --- NEW FUNCTION TO GENERATE PDF FROM TERMS ---
const escapeHtml = (unsafe: string): string => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '');
};

/**
 * Generates a PDF from a list of structured analysis terms.
 * This is the new function for creating marked/modified contracts.
 * @returns A promise that resolves to the local URI of the generated PDF.
 */
export const generatePdfFromTerms = async (
  terms: EnrichedTerm[],
  isRTL: boolean,
  fileName: string,
  documentTitle: string
): Promise<string | null> => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          body {
            font-family: 'Cairo', 'Helvetica Neue', Arial, sans-serif;
            direction: ${isRTL ? 'rtl' : 'ltr'};
            font-size: 14px;
            line-height: 1.8;
            padding: 25px;
            color: #333;
            background-color: #ffffff;
          }
          h1 {
            text-align: center;
            color: #1a2a44;
            font-weight: 700;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .term {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            page-break-inside: avoid;
            border-right: ${isRTL ? '5px solid transparent' : 'none'};
            border-left: ${!isRTL ? '5px solid transparent' : 'none'};
          }
          .compliant { border-color: #22c55e; }
          .non-compliant { border-color: #ef4444; }
          .modified { background-color: #fef9c3; }
          .original-term {
            text-decoration: line-through;
            color: #94a3b8;
            font-size: 11px;
            margin-top: 8px;
          }
          p { margin: 0; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(documentTitle)}</h1>
        ${terms
          .map(term => {
            const termText = escapeHtml(term.modified_term || term.term_text);
            const originalTermText =
              term.modified_term && term.term_text
                ? `<p class="original-term">${escapeHtml(term.term_text)}</p>`
                : '';
            const complianceClass = term.is_valid_sharia ? 'compliant' : 'non-compliant';
            const modifiedClass = term.modified_term ? 'modified' : '';
            return `
              <div class="term ${complianceClass} ${modifiedClass}">
                <p>${termText}</p>
                ${originalTermText}
              </div>
            `;
          }).join('')}
      </body>
      </html>
    `;

    const options = {
      html: htmlContent,
      fileName: fileName.replace(/[^a-z0-9]/gi, '_'),
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    console.log('📄 PDF Generated from terms at:', file.filePath);
    return Platform.OS === 'android' ? `file://${file.filePath}` : file.filePath;
  } catch (error) {
    console.error('❌ Error generating PDF from terms:', error);
    return null;
  }
};


// --- YOUR ORIGINAL CODE (PRESERVED) ---

export interface PDFGenerationOptions {
  images: string[];
  filename?: string;
  quality?: number;
}

export interface PDFResult {
  success: boolean;
  uri?: string;
  error?: string;
}

export const generatePDFFromImages = async (options: PDFGenerationOptions): Promise<PDFResult> => {
  const { images, filename = 'contract_document', quality = 0.8 } = options;

  if (!images || images.length === 0) {
    return { success: false, error: 'No images provided' };
  }

  try {
    const htmlContent = createHTMLFromImages(images);
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      width: 612,
      height: 792,
    });

    if (Platform.OS === 'android') {
      const newUri = `${FileSystem.documentDirectory}${filename}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      return { success: true, uri: newUri };
    }
    return { success: true, uri };
  } catch (error) {
    console.error('PDF generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const sharePDF = async (uri: string, filename: string = 'contract'): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Contract PDF',
        UTI: 'com.adobe.pdf',
      });
      return true;
    } else {
      Alert.alert('Sharing not available', 'PDF saved to device storage');
      return true;
    }
  } catch (error) {
    console.error('PDF sharing failed:', error);
    Alert.alert('Share Failed', 'Could not share the PDF file');
    return false;
  }
};

const createHTMLFromImages = (images: string[]): string => {
  const imageElements = images
    .map((imageUri, index) => {
      return `
        <div style="page-break-before: ${index > 0 ? 'always' : 'auto'}; margin: 0; padding: 20px;">
          <img
            src="${imageUri}"
            style="
              width: 100%;
              height: auto;
              max-width: 100%;
              max-height: 90vh;
              object-fit: contain;
              display: block;
              margin: 0 auto;
            "
            alt="Contract page ${index + 1}"
          />
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Document</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .page {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          @media print {
            .page {
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        ${imageElements}
      </body>
    </html>
  `;
};

export const generateTextDocument = async (
  text: string,
  filename: string = 'contract_text'
): Promise<PDFResult> => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Contract Document</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Contract Document</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">${text}</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (Platform.OS === 'android') {
      const newUri = `${FileSystem.documentDirectory}${filename}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      return { success: true, uri: newUri };
    }

    return { success: true, uri };
  } catch (error) {
    console.error('Text PDF generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
export const generatePdf = async (
  terms: EnrichedTerm[],
  isRTL: boolean,
  fileName: string = 'contract_document',
  documentTitle: string = 'Contract Document'
): Promise<string | null> => {
  try {
    const pdfUri = await generatePdfFromTerms(terms, isRTL, fileName, documentTitle);
    if (!pdfUri) {
      throw new Error('Failed to generate PDF from terms');
    }
    return pdfUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};