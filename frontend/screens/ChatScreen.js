import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Keyboard,
  StatusBar,
  Animated,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';

const { height: screenHeight } = Dimensions.get('window');

const normalizeText = (text) => {
  const replacements = {
    '\u201c': '"', '\u201d': '"',
    '\u2018': "'", '\u2019': "'",
    '\u2013': '-', '\u2014': '-',
    '…': '...', '“': '"', '”': '"',
    '‘': "'", '’': "'", '–': '-', '—': '-',
  };
  return text.replace(/[\u201c\u201d\u2018\u2019\u2013\u2014…“”‘’–—]/g, match => replacements[match] || match);
};

const LoadingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      const createAnimation = (dot, delay) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]);

      Animated.loop(
        Animated.parallel([
          createAnimation(dot1, 0),
          createAnimation(dot2, 200),
          createAnimation(dot3, 400),
        ])
      ).start();
    };

    animateDots();
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
    </View>
  );
};

export default function ChatScreen({ route, navigation }) {
  const { promptText } = route.params || {};
  const user = route.params?.user || { email: "guest@ekomind.com" };

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recording, setRecording] = useState(null);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [recordingIndicator, setRecordingIndicator] = useState('');
  const [sound, setSound] = useState();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const inputBottom = useRef(new Animated.Value(61)).current;
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const recordingButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    requestAudioPermissions();
  }, []);

  const requestAudioPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setHasAudioPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Enable microphone to use voice input.');
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(inputBottom, {
        toValue: e.endCoordinates.height,
        duration: 120,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(inputBottom, {
        toValue: 61,
        duration: 120,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (promptText) sendMessage(promptText);
  }, [promptText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  const playBeepSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/beep.mp3')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (e) {
      console.error('Beep error:', e);
    }
  };

  const startRecording = async () => {
    if (!hasAudioPermission) {
      await requestAudioPermissions();
      return;
    }

    try {
      await playBeepSound();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingIndicator('Recording...');
      Animated.spring(recordingButtonScale, { toValue: 1.2, useNativeDriver: true }).start();
    } catch (e) {
      console.error('Start recording error:', e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await playBeepSound();
      setIsRecording(false);
      setIsProcessingVoice(true);
      setRecordingIndicator('Processing...');
      Animated.spring(recordingButtonScale, { toValue: 1, useNativeDriver: true }).start();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      await sendVoiceMessage(uri);
      setRecording(null);
    } catch (e) {
      console.error('Stop recording error:', e);
    } finally {
      setIsProcessingVoice(false);
      setRecordingIndicator('');
    }
  };

  const sendVoiceMessage = async (audioUri) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { role: 'bot', isLoading: true, isVoiceProcessing: true }]);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_message.m4a',
      });
      formData.append('email', user?.email);
      formData.append('model', "openai/gpt-4o-mini");

      const response = await fetch('http://192.168.1.11:8000/voiceinput', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();

      const botMsg = {
        role: 'bot',
        content: '',
        scriptOffered: data.script_offered || false,
        scriptId: data.script_id || null,
        scriptMetadata: data.script_metadata || null,
      };

      if (data.transcribed_text) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'user', content: `🎤 "${data.transcribed_text}"` },
          botMsg,
        ]);
        simulateStreaming(data.message || '');
      } else {
        setMessages(prev => [...prev.slice(0, -1), botMsg]);
        simulateStreaming(data.message || '');
      }
    } catch (e) {
      console.error('Voice message error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateStreaming = (fullText) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index >= fullText.length) {
        clearInterval(interval);
        return;
      }
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          content: (last.content || '') + fullText[index]
        };
        return updated;
      });
      index++;
    }, 20); // adjust speed as needed
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg = { role: 'user', content: normalizeText(messageText) };
    setInput('');
    setMessages(prev => [...prev, userMsg, { role: 'bot', content: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://192.168.1.11:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          message: userMsg.content,
          model: 'openai/gpt-4o-mini'
        }),
      });

      const data = await response.json();
      simulateStreaming(data.message || 'No response');

    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'bot', content: 'Server error. Try again.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      sendMessage();
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
      <BlurView
        intensity={item.role === 'user' ? 30 : 40}
        tint={item.role === 'user' ? 'light' : 'dark'}
        style={[
          styles.glassEffect,
          item.role === 'user' ? styles.userGlass : styles.botGlass
        ]}
      >
        {item.isLoading ? (
          <View>
            <LoadingDots />
            {item.isVoiceProcessing && (
              <Text style={[styles.msgText, styles.botText, { fontSize: 12, opacity: 0.7, marginTop: 8 }]}>
                Processing voice message...
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.msgText, item.role === 'user' ? styles.userText : styles.botText]}>
            {item.content}
          </Text>
        )}
      </BlurView>
    </View>
  );
return (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="#000000" />

    {/* Main Content with Gradient */}
    <LinearGradient
      colors={['#000000', '#000000', '#FF4800']}
      locations={[0, 0.4, 1]}
      start={{ x: 0, y: 0.2 }}
      end={{ x: 1, y: 0.9 }}
      style={styles.gradient}
    >
      {/* Logo Header */}
      <View style={styles.header}>
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
          <Image 
            source={require('../assets/ekologo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </BlurView>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: keyboardVisible ? 20 : 100 }
        ]}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
      />
    </LinearGradient>

    {/* Input Bar with Voice Support */}
    <View style={[styles.inputAreaContainer, { bottom: keyboardVisible ? keyboardHeight : 61 }]}>
        <View intensity={80} tint="dark" style={styles.inputBlur}>
          <Animated.View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              placeholder={recordingIndicator || "Ask me anything..."}
              placeholderTextColor={recordingIndicator ? "#FF4800" : "rgba(255,255,255,0.4)"}
              value={input}
              onChangeText={setInput}
              style={[
                styles.input,
                recordingIndicator && styles.inputRecording
              ]}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              multiline={false}
              blurOnSubmit={false}
              editable={!isLoading && !isProcessingVoice}
            />
            {/* Always show both buttons */}
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={styles.sendBtn}
              disabled={isLoading || isProcessingVoice}
            >
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: recordingButtonScale }] }}>
              <TouchableOpacity 
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={[
                  styles.voiceBtn,
                  isRecording && styles.voiceBtnActive,
                  (!hasAudioPermission || isLoading || isProcessingVoice) && styles.voiceBtnDisabled
                ]}
                disabled={!hasAudioPermission || isLoading || isProcessingVoice}
              >
                {isProcessingVoice ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={isRecording ? "mic" : "mic-outline"} 
                    size={24} 
                    color={isRecording ? "#FF4800" : "#FFFFFF"} 
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {/* Bottom Nav Bar */}
      {!keyboardVisible && (
        <View style={styles.navbarContainer}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('UserProfile')}
          >
            <Ionicons name="person-outline" size={24} color="#FFFFFF" />
            <Text style={styles.navLabel}>PROFILE</Text>
          </TouchableOpacity>

          <View style={styles.activeNavItemContainer}>
            <TouchableOpacity style={styles.activeNavItem}>
              <Ionicons name="chatbubble" size={24} color="#FF4800" />
              <Text style={styles.activeNavLabel}>CHAT</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('ChatHome')}
          >
            <Ionicons name="home-outline" size={24} color="#FFFFFF" />
            <Text style={styles.navLabel}>HOME</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  logo: {
    height: 30,
    width: 60,
  },
  chatList: {
    flex: 1,
  },
  chatContent: { 
    padding: 16,
    paddingBottom: 20,
  },
  msgBubble: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  glassEffect: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  userGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  botGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  // Loading animation styles
  loadingMessageContainer: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
    maxWidth: '85%',
  },
  loadingMessageBlur: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 72, 0, 0.3)',
    borderBottomLeftRadius: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4800',
    marginHorizontal: 2,
  },
  // Input area styling
  inputAreaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputBlur: {
    overflow: 'hidden',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    color: '#fff',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 50,
    fontSize: 16,
    borderWidth: 0,
    marginLeft: 8,
    marginRight: 8,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#000000',
    width: 45,
    height: 45,
    borderRadius: 20,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  // Voice button styles
  voiceBtn: {
    marginLeft: 8,
    backgroundColor: '#000000',
    width: 45,
    height: 45,
    borderRadius: 20,
    borderColor: '#000000',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceBtnActive: {
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderColor: '#FF4800',
    borderWidth: 2,
  },
  voiceBtnDisabled: {
    opacity: 0.5,
  },
  // Bottom Navigation Styles
  navbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 61,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderTopWidth: 0.5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeNavItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 4,
  },
  activeNavLabel: {
    color: '#FF4800',
    fontSize: 10,
    marginTop: 4,
  },
  // Script container styles
  scriptContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 0, 0.4)',
  },
  scriptTitle: {
    color: '#FF4800',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scriptMeta: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  inputRecording: {
    borderColor: '#FF4800',
    borderWidth: 1,
  },

});