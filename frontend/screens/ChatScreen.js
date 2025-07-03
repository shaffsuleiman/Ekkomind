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

import uuid from 'react-native-uuid';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  query,        
  orderBy,      
  getDocs       
} from 'firebase/firestore';
import { db,auth } from '../firebase';

const { height: screenHeight } = Dimensions.get('window');

const normalizeText = (text) => {
  const replacements = {
    '\u201c': '"', '\u201d': '"',
    '\u2018': "'", '\u2019': "'",
    '\u2013': '-', '\u2014': '-',
    '…': '...',
  };
  return text.replace(/[\u201c\u201d\u2018\u2019\u2013\u2014…""''–—]/g, match => replacements[match] || match);
};

// Create a function to handle chat initialization
const initializeChat = async (userEmail, chatId) => {
  try {
    const chatRef = doc(db, 'userchats', userEmail, 'chats', chatId);
    await setDoc(chatRef, {
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      id: chatId
    });
    return chatRef;
  } catch (error) {
    console.error('Error initializing chat:', error);
    throw error;
  }
};

const fetchUserProfile = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data(); // entire user profile object
    } else {
      console.warn('User document does not exist');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Modify the saveMessageToFirestore function
const saveMessageToFirestore = async (userEmail, chatId, messageObj) => {
  try {
    // First check if chat exists
    const chatRef = doc(db, 'users', userEmail, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    // If chat doesn't exist, create it
    if (!chatDoc.exists()) {
      await initializeChat(userEmail, chatId);
    }

    // Add message to the chat
    const messageRef = collection(db, 'users', userEmail, 'chats', chatId, 'messages');
    const docRef = await addDoc(messageRef, {
      ...messageObj,
      timestamp: serverTimestamp(),
    });

    // Update chat's lastUpdated
    await setDoc(chatRef, {
      lastUpdated: serverTimestamp()
    }, { merge: true });

    return docRef;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

const BlinkingProcessingText = () => {
  return (
    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: '#FF4800', fontWeight: '600' }}>
        Processing...
      </Text>
    </View>
  );
};



// Format time like WhatsApp
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function ChatScreen({ route, navigation }) {
  const { promptText } = route.params || {};
  const user = route.params?.user || { email: auth.currentUser?.email };

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

  const [chatId] = useState(() => {
    return route.params?.chatId || uuid.v4();
  });
  const [isExistingChat] = useState(() => route.params?.isExistingChat || false);

  // Animation refs for WhatsApp-style input
  const inputContainerWidth = useRef(new Animated.Value(1)).current;
  const voiceButtonScale = useRef(new Animated.Value(1)).current;
  const voiceButtonOpacity = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(input.trim().length > 0 ? 1 : 0)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  const loadExistingMessages = async (existingChatId) => {
    if (!existingChatId || !user?.email) return;
    
    try {
      setIsLoading(true);
      const messagesRef = collection(db, 'users', user.email, 'chats', existingChatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(messagesQuery);
      
      const existingMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(existingMessages);
    } catch (error) {
      console.error('Error loading existing messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inputBottom = useRef(new Animated.Value(61)).current;
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

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
    if (isExistingChat && route.params?.chatId) {
      loadExistingMessages(route.params.chatId);
    } else if (promptText) {
      sendMessage(promptText);
    }
  }, [route.params?.chatId, isExistingChat, promptText]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(inputBottom, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(inputBottom, {
        toValue: 61,
        duration: 250,
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

  // WhatsApp-style input animations
  useEffect(() => {
    if (input.trim().length > 0) {
      // Show send button, hide voice button
      Animated.parallel([
        Animated.timing(voiceButtonOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(voiceButtonScale, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(sendButtonScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      // Show voice button, hide send button
      Animated.parallel([
        Animated.timing(voiceButtonOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(voiceButtonScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(sendButtonScale, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [input]);

  // Recording pulse animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(recordingPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordingPulse.setValue(1);
    }
  }, [isRecording]);

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
    
    // Add loading message with proper structure
    const loadingMessage = { 
      id: `loading-${Date.now()}`,
      role: 'bot', 
      content: '', 
      isLoading: true, 
      isVoiceProcessing: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, loadingMessage]);
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

      // Remove the loading indicator
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

      // Show transcribed text immediately if available
      if (data.transcribed_text) {
        const userMsg = { 
          id: `user-${Date.now()}`,
          role: 'user', 
          content: `🎤 "${data.transcribed_text}"`,
          isVoiceTranscription: true,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        await saveMessageToFirestore(user.email, chatId, userMsg);

        // Small delay to show the transcription before bot response
        setTimeout(() => {
          const botMsg = {
            id: `bot-${Date.now()}`,
            role: 'bot',
            content: '',
            scriptOffered: data.script_offered || false,
            scriptId: data.script_id || null,
            scriptMetadata: data.script_metadata || null,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, botMsg]);
          saveMessageToFirestore(user.email, chatId, botMsg);
          simulateStreaming(data.message || '');
        }, 300);
      } else {
        const botMsg = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: '',
          scriptOffered: data.script_offered || false,
          scriptId: data.script_id || null,
          scriptMetadata: data.script_metadata || null,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
        simulateStreaming(data.message || '');
      }
    } catch (e) {
      console.error('Voice message error:', e);
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== loadingMessage.id),
        { 
          id: `error-${Date.now()}`,
          role: 'bot', 
          content: 'Voice processing failed. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateStreaming = (fullText) => {
  if (!fullText) return;

  let index = 0;
  let currentText = '';

  const streamNextChunk = () => {
    if (index < fullText.length) {
      currentText += fullText[index];
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: currentText,
            isLoading: true,
          };
        }

        return updated;
      });

      index++;
      setTimeout(streamNextChunk, 20); // adjust speed here
    } else {
      // Finish streaming: turn off loading
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            isLoading: false,
          };
        }

        return updated;
      });
    }
  };

  // Initial trigger
  streamNextChunk();
};


const sendMessage = async (messageText = input) => {
  if (!messageText.trim() || isLoading) return;

  const userMsg = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: normalizeText(messageText),
    timestamp: new Date().toISOString(),
  };

  const botMsg = {
    id: `bot-${Date.now()}`,
    role: 'bot',
    content: '',          // leave empty for streaming
    isLoading: true,      // show loading indicator
    timestamp: new Date().toISOString(),
  };

  setInput('');
  setMessages(prev => [...prev, userMsg, botMsg]);
  setIsLoading(true);

  try {
    // Save user message to Firestore
    await saveMessageToFirestore(user.email, chatId, userMsg);

    // Fetch user profile
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;
    const userProfile = await fetchUserProfile(uid);

    // Call backend
    const response = await fetch('http://192.168.1.11:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        message: userMsg.content,
        model: 'openai/gpt-4o-mini',
        user_profile: userProfile,
      }),
    });

    const data = await response.json();

    // Stream into the last bot message in messages
    simulateStreaming(data.message || '');

    // Optionally save final bot message after delay
    setTimeout(async () => {
      const finalBotMsg = {
        ...botMsg,
        content: data.message || 'No response',
        isLoading: false,
      };
      await saveMessageToFirestore(user.email, chatId, finalBotMsg);
    }, (data.message?.length || 20) * 20 + 500); // delay = chars * interval + buffer

  } catch (e) {
    console.error('Chat error:', e);
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: 'Server error. Try again.',
          isLoading: false,
        };
      }
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
    <View
      style={[
        styles.glassEffect,
        item.role === 'user' ? styles.userGlass : styles.botGlass,
        item.isVoiceTranscription && styles.voiceTranscriptionGlass
      ]}
    >
      {item.isLoading ? (
        // This is the loading state - let's make it more visible
        <View style={styles.loadingMessageContainer}>
          <ActivityIndicator size="small" color="#FF4800" />
          <Text style={styles.processingText}>
            {item.isVoiceProcessing ? "Processing voice..." : "Loading..."}
          </Text>
        </View>
      ) : (
        <View>
          <Text style={[
            styles.msgText, 
            item.role === 'user' ? styles.userText : styles.botText,
            item.isVoiceTranscription && styles.voiceTranscriptionText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.timestampText,
            item.role === 'user' ? styles.userTimestamp : styles.botTimestamp
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      )}
    </View>
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
          keyExtractor={(item) => item.id || item.timestamp}
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

      {/* WhatsApp-Style Input Bar */}
      <Animated.View style={[styles.inputAreaContainer, { bottom: inputBottom }]}>
        <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
          <View style={styles.whatsappInputContainer}>
            {/* Main Input Container */}
            <View style={styles.inputRow}>
              <View style={styles.textInputContainer}>
                <TextInput
                  ref={inputRef}
                  placeholder={recordingIndicator || "Type a message..."}
                  placeholderTextColor={recordingIndicator ? "#FF4800" : "rgba(255,255,255,0.6)"}
                  value={input}
                  onChangeText={setInput}
                  style={styles.whatsappInput}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                  multiline={true}
                  maxLength={500}
                  editable={!isLoading && !isProcessingVoice && !isRecording}
                />
                
                {/* Voice Button Inside Input */}
                {input.trim().length === 0 && (
                  <Animated.View 
                    style={[
                      styles.inlineVoiceButton,
                      { 
                        opacity: voiceButtonOpacity,
                        transform: [
                          { scale: Animated.multiply(voiceButtonScale, recordingPulse) }
                        ]
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      onPressIn={startRecording}
                      onPressOut={stopRecording}
                      style={[
                        styles.voiceBtnInline,
                        isRecording && styles.voiceBtnRecording,
                        (!hasAudioPermission || isLoading || isProcessingVoice) && styles.voiceBtnDisabled
                      ]}
                      disabled={!hasAudioPermission || isLoading || isProcessingVoice}
                      activeOpacity={0.7}
                    >
                      {isProcessingVoice ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons 
                          name={isRecording ? "mic" : "mic-outline"} 
                          size={20} 
                          color={isRecording ? "#FF4800" : "#FFFFFF"} 
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>

              {/* Send Button */}
              <Animated.View 
                style={[
                  styles.sendButtonContainer,
                  { transform: [{ scale: sendButtonScale }] }
                ]}
              >
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  style={styles.whatsappSendBtn}
                  disabled={isLoading || isProcessingVoice || !input.trim()}
                >
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Recording Indicator */}
            {(isRecording || isProcessingVoice) && (
              <View style={styles.recordingIndicatorContainer}>
                <View style={styles.recordingIndicatorDot} />
                <Text style={styles.recordingIndicatorText}>
                  {recordingIndicator}
                </Text>
              </View>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {/* Bottom Nav Bar */}
      {!keyboardVisible && (
        <View style={styles.navbarContainer}>
          <View style={styles.activeNavItemContainer}>
            <TouchableOpacity style={styles.activeNavItem}>
              <Ionicons name="chatbubble" size={24} color="#FF4800" />
              <Text style={styles.activeNavLabel}>CHAT</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('UserProfile')}
          >
            <Ionicons name="person-outline" size={24} color="#FFFFFF" />
            <Text style={styles.navLabel}>PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('ChatHistory')}
          >
            <Ionicons name="time" size={24} color="#FFFFFF" />
            <Text style={styles.navLabel}>HISTORY</Text>
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  botGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  voiceTranscriptionGlass: {
    backgroundColor: 'rgba(255, 72, 0, 0.1)',
    borderColor: 'rgba(255, 72, 0, 0.3)',
  },
  voiceTranscriptionText: {
    color: '#FFB366',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  // WhatsApp-style timestamps
  timestampText: {
    fontSize: 11,
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  userTimestamp: {
    color: '#FFFFFF',
  },
  botTimestamp: {
    color: '#FFFFFF',
  },
  // Fixed Loading animation styles
  loadingMessageContainer: {
  padding: 10,
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 50,
},
processingText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#FF4800',
  textAlign: 'center',
  marginTop: 8,
},
  // WhatsApp-style input area
  inputAreaContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputBlur: {
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  whatsappInputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(50, 50, 50, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 50,
    maxHeight: 120,
  },
    whatsappInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
  },
  inlineVoiceButton: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceBtnInline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceBtnRecording: {
    backgroundColor: 'rgba(255, 72, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#FF4800',
  },
  voiceBtnDisabled: {
    opacity: 0.5,
  },
  sendButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  recordingIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4800',
    marginRight: 8,
  },
  recordingIndicatorText: {
    color: '#FF4800',
    fontSize: 12,
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
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  activeNavItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    fontWeight: '600',
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
  loadingMessageContainer: {
  minHeight: 40,
  justifyContent: 'center',
  alignItems: 'center',
},
});