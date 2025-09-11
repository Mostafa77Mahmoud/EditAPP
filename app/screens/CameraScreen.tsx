import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Camera, RotateCcw, Check, X, Image as ImageIcon } from 'lucide-react-native';
import { Button } from '../components/ui/button';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { ScreenType } from '../MobileApp';

const { width } = Dimensions.get('window');

interface CameraScreenProps {
  onUpload?: (file: { uri: string; name: string; mimeType: string; type: string; size: number }) => void;
  onNavigate?: (screen: ScreenType) => void;
}

interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string | null;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ onUpload, onNavigate }) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    (async () => {
      await requestPermission();
      if (Platform.OS !== 'web') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    })();
  }, [requestPermission]);

  const generatePdfForUpload = useCallback(async (images: CapturedImage[]) => {
    console.log(`Generating PDF from ${images.length} images`);
    if (images.length === 0) {
      throw new Error('No images to generate PDF.');
    }

    // Filter out images with null or undefined base64
    const validImages = images.filter((image): image is CapturedImage & { base64: string } => image.base64 != null);
    if (validImages.length === 0) {
      throw new Error('No valid images with base64 data to generate PDF.');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; }
            img { width: 100%; height: auto; display: block; page-break-after: always; }
            img:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>
          ${validImages.map(image => `
            <img src="data:image/jpeg;base64,${image.base64}" />
          `).join('')}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('PDF generated successfully at URI:', uri);

      const fileName = `contract_camera_${Date.now()}.pdf`;

      // Get file info to determine size
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      const fileSize = fileInfo.exists ? fileInfo.size ?? 0 : 0;

      const file = {
        uri,
        name: fileName,
        mimeType: 'application/pdf',
        type: 'application/pdf',
        size: fileSize,
      };

      return file;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF from images.');
    }
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: false,
      });

      if (photo && photo.base64) {
        const newImage: CapturedImage = {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          base64: photo.base64,
        };
        setCapturedImages(prev => [...prev, newImage]);
        console.log(`Page ${capturedImages.length + 1} captured successfully`);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert(t('camera.error'), t('camera.captureError'));
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages.length, t]);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const newImages: CapturedImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          base64: asset.base64,
        }));
        setCapturedImages(prev => [...prev, ...newImages]);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('camera.error'), t('camera.galleryError'));
    }
  }, [t]);

  const analyzeDocument = useCallback(async () => {
    if (capturedImages.length === 0) {
      Alert.alert(t('camera.noImages'), t('camera.takePhotoFirst'));
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting PDF generation for analysis...');
      const pdfDocument = await generatePdfForUpload(capturedImages);
      console.log('PDF document prepared for upload:', pdfDocument.name);

      if (onUpload && typeof onUpload === 'function') {
        console.log('📁 CameraScreen: Calling onUpload with PDF document');

        // Ensure all necessary properties are present for upload
        const fileToUpload = {
          uri: pdfDocument.uri,
          name: pdfDocument.name,
          mimeType: pdfDocument.mimeType || 'application/pdf',
          type: pdfDocument.type || 'application/pdf',
          size: pdfDocument.size || 0,
        };

        onUpload(fileToUpload);
      } else {
        console.error('onUpload handler is not available.');
        Alert.alert(t('camera.error'), 'Upload handler not configured.');
      }

      setCapturedImages([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Error analyzing document:', error);
      Alert.alert(t('camera.uploadError'), (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages, generatePdfForUpload, onUpload, t]);

  const retakePhotos = useCallback(() => {
    setCapturedImages([]);
    setShowPreview(false);
  }, []);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  const styles = getStyles(isDark, isRTL);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t('camera.requestingPermission')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>{t('camera.permissionDenied')}</Text>
          <Button onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>{t('camera.grantPermission')}</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (showPreview && capturedImages.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: isRTL ? 15 : 0 }]}>
          <Text style={styles.title}>
            {t('camera.preview')} ({capturedImages.length} {t('camera.pages')})
          </Text>
        </View>

        <ScrollView style={styles.previewScrollContainer} contentContainerStyle={styles.previewContent}>
          {capturedImages.map((image, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Text style={styles.pageLabel}>{t('camera.page')} {index + 1}</Text>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.previewActions}>
          <Button
            onPress={retakePhotos}
            variant="outline"
            style={RNStyleSheet.flatten([styles.actionButton, styles.retakeButton])}
            disabled={isProcessing}
          >
            <X size={20} color={isDark ? '#fff' : '#000'} />
            <Text style={styles.actionButtonText}>{t('camera.retake')}</Text>
          </Button>

          <Button
            onPress={analyzeDocument}
            style={RNStyleSheet.flatten([styles.actionButton, styles.confirmButton])}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Check size={20} color="#fff" />
            )}
            <Text style={styles.confirmButtonText}>
              {isProcessing ? t('processing') : t('camera.analyzeDocument')}
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: isRTL ? 15 : 0 }]}>
        <Text style={styles.title}>{t('camera.title')}</Text>
        {capturedImages.length > 0 && (
          <Text style={styles.captureCount}>
            {capturedImages.length} {t('camera.photosCount')}
          </Text>
        )}
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash="off"
        />
        {isProcessing && <View style={styles.processingOverlay}><ActivityIndicator size="large" color="#fff" /></View>}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={pickFromGallery}>
          <ImageIcon size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={isProcessing}>
          <Camera size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
          <RotateCcw size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      {capturedImages.length > 0 && (
        <View style={styles.bottomActions}>
          <Button
            onPress={() => setShowPreview(true)}
            style={styles.previewButton}
          >
            <Text style={styles.previewButtonText}>{t('camera.preview')} ({capturedImages.length})</Text>
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#000' : '#fff',
    paddingTop: Platform.OS === 'ios' ? 44 : 30, // Safe area for status bar and notch
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: isDark ? '#fff' : '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: isDark ? '#ccc' : '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333' : '#eee',
    alignItems: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between', // To push title to center when needed
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#000',
    textAlign: 'center', // Center the title
    flex: 1, // Allow title to take available space
  },
  captureCount: {
    fontSize: 14,
    color: isDark ? '#aaa' : '#666',
    marginTop: 4,
    // Position count to the right if not in RTL, or left if in RTL
    marginLeft: isRTL ? 'auto' : 0,
    marginRight: isRTL ? 0 : 'auto',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  processingOverlay: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: isDark ? '#111' : '#f8f8f8',
  },
  controlButton: {
    padding: 15,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDark ? '#333' : '#fff',
  },
  bottomActions: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333' : '#eee',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  previewButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewScrollContainer: {
    flex: 1,
  },
  previewContent: {
    padding: 10,
  },
  previewImageContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  pageLabel: {
    fontSize: 16,
    color: isDark ? '#ccc' : '#333',
    marginBottom: 5,
  },
  previewImage: {
    width: width - 40,
    height: (width - 40) * 1.41, // A4 aspect ratio
    resizeMode: 'contain',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#ddd',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333' : '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retakeButton: {
    backgroundColor: isDark ? '#333' : '#eee',
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: isDark ? '#fff' : '#000',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CameraScreen;