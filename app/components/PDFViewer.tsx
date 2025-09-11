// --- START OF FILE PDFViewer.tsx ---

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { X, Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';

// FIX: Removed all code related to react-native-pdf library to ensure Expo Go compatibility.

interface PDFViewerProps {
  // FIX: Renamed pdfUrl to sourceUrl for clarity, but keeping pdfUrl for backward compatibility.
  // The component now primarily expects a remote URL.
  pdfUrl: string;
  title?: string;
  onClose: () => void;
  cloudinaryPublicId?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  title = 'PDF Document',
  onClose,
  cloudinaryPublicId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // FIX: Removed pdfLibError state as it's no longer needed.

  useEffect(() => {
    loadPDF();
  }, [pdfUrl]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📄 Loading PDF from:', pdfUrl);

      // For web, we don't download. We use a remote viewer.
      // We also check if the URL is a local file URI, which happens with the dynamic generator.
      if (Platform.OS === 'web' && !pdfUrl.startsWith('file://')) {
        setLocalUri(pdfUrl); // Use the remote URL directly for the web viewer
        setLoading(false);
        return;
      }

      // For native platforms OR local file URIs on web, we attempt to use/download it.
      // If the URL is already a local file, just use it.
      if (pdfUrl.startsWith('file://')) {
        console.log('📄 Using existing local file URI.');
        setLocalUri(pdfUrl);
        setLoading(false);
        return;
      }

      // For remote URLs on native, download and cache the PDF for performance.
      await downloadAndCachePDF(pdfUrl);

    } catch (err) {
      console.error('❌ PDF loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setLoading(false);
    }
  };

  const downloadAndCachePDF = async (url: string) => {
    try {
      const filename = `pdf_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      console.log(`📥 Downloading PDF to: ${fileUri}`);

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (progress) => {
          const percentage = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
          setDownloadProgress(percentage);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result?.uri) {
        console.log('✅ Download complete.');
        setLocalUri(result.uri);
      } else {
        throw new Error('Download failed, result URI is missing.');
      }
    } catch (err) {
      console.error('❌ PDF download error:', err);
      throw err; // Re-throw to be caught by loadPDF
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      // Use localUri if available (downloaded file), otherwise share the remote URL.
      const uriToShare = localUri || pdfUrl;
      if (!uriToShare) {
        Alert.alert('Error', 'No document available to share.');
        return;
      }
      await Sharing.shareAsync(uriToShare, {
        mimeType: 'application/pdf',
        dialogTitle: title,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            {downloadProgress > 0 && downloadProgress < 100
              ? `Downloading PDF... ${downloadProgress}%`
              : 'Loading PDF...'}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadPDF} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Determine the source for the WebView.
    let webViewSourceUri = localUri;

    // For mobile, use Google Docs viewer for better PDF rendering
    if (Platform.OS !== 'web' && localUri && !localUri.startsWith('file://')) {
        webViewSourceUri = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(localUri)}`;
    } else if (Platform.OS === 'web' && localUri && !localUri.startsWith('file://')) {
        webViewSourceUri = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(localUri)}`;
    }

    if (!webViewSourceUri) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No PDF source available to display.</Text>
        </View>
      );
    }

    return (
      <WebView
        source={{ uri: webViewSourceUri }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent: any) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError(`Failed to load PDF: ${nativeEvent.description || 'Unknown WebView error'}`);
        }}
        originWhitelist={['*']} // Allows all origins, including file://
        allowFileAccess={true}
        startInLoadingState={true}
        renderLoading={() => (
           <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10b981" /></View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Share2 size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PDFViewer; 