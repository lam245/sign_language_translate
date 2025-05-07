import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
  Text,
  Dimensions,
  Animated,
  Easing,
  Modal,
  BackHandler,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HomeScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [isRecording, setIsRecording] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const cameraRef = useRef<Camera | null>(null);

  // Animated spin value and loop reference
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Handle Android back button to close modal
  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [modalVisible]);

  // Start or stop the spinning animation when `processing` changes
  useEffect(() => {
    if (processing) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinLoop.current = null;
      spinValue.setValue(0);
    }
  }, [processing, spinValue]);

  // Interpolate spin value to degrees
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Request permissions for camera, microphone, and media library
  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();

      setHasPermission(
        cameraStatus.status === 'granted' &&
        audioStatus.status === 'granted' &&
        mediaLibraryStatus.status === 'granted'
      );
    })();
  }, []);

  // Pick video from library
  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVideo(result.assets[0]);
      simulateRecognition();
    }
  };

  // Toggle between front and back cameras
  const toggleCameraType = () => {
    setCameraType(current =>
      current === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  // Start/stop video recording
  const toggleRecording = async () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      setRecognitionResult(null);
      if (cameraRef.current) {
        setIsRecording(true);
        const recorded = await cameraRef.current.recordAsync({
          maxDuration: 10,
          quality: '720p',
        });
        setVideo(recorded);
        simulateRecognition();
      }
    }
  };

  // Simulate recognition process
  const simulateRecognition = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setRecognitionResult('Hello');
      setIsCameraActive(false);
      setModalVisible(true);
    }, 2000);
  };

  // Close modal and reactivate camera
  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => {
      setIsCameraActive(true);
    }, 300);
  };

  // Permission states rendering
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera or media library</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {isCameraActive ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          ratio="16:9"
        >
          {processing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingIndicatorContainer}>
                <Animated.View 
                  style={[
                    styles.rotatingRing, 
                    { transform: [{ rotate: spin }] }
                  ]}
                />
                <Text style={styles.overlappingProcessingText}>Đang xử lý</Text>
              </View>
            </View>
          )}

          <View style={styles.controlBarContainer}>
            <View style={styles.controlBar}>
              <TouchableOpacity style={styles.controlButton} onPress={pickVideo}>
                <MaterialIcons name="photo-library" size={32} color="black" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.recordButton} onPress={toggleRecording}>
                <MaterialCommunityIcons
                  name={isRecording ? "stop" : "camera-iris"}
                  size={38}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
                <MaterialIcons name="flip-camera-ios" size={32} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      ) : (
        <View style={[styles.camera, { backgroundColor: 'black' }]} />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalResultText}>{recognitionResult}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeModal}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  controlBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#eebdc1',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 40,
    width: SCREEN_WIDTH * 0.65,
  },
  controlButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  processingIndicatorContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rotatingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'rgba(255, 0, 0, 0.5)',
    borderBottomColor: 'red',
    position: 'absolute',
  },
  overlappingProcessingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    zIndex: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modalResultText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 50,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#eebdc1',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 15,
    marginTop: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
