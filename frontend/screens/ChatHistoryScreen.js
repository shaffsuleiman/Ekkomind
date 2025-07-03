import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onSnapshot } from 'firebase/firestore';
import { Alert } from 'react-native';


const { height: screenHeight } = Dimensions.get('window');
const confirmDeleteChat = (chatId) => {
  Alert.alert(
    'Delete Chat',
    'Are you sure you want to permanently delete this chat?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteChatSession(chatId),
      },
    ]
  );
};

const deleteChatSession = async (chatId) => {
  try {
    const userEmail = auth.currentUser?.email;
    const chatRef = doc(db, 'users', userEmail, 'chats', chatId);
    const messagesRef = collection(db, 'users', userEmail, 'chats', chatId, 'messages');

    const messageDocs = await getDocs(messagesRef);
    const deletions = messageDocs.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletions); // delete messages
    await deleteDoc(chatRef);     // delete chat doc
  } catch (error) {
    console.error('Failed to delete chat:', error);
    Alert.alert('Error', 'Failed to delete chat');
  }
};

export default function ChatHistoryScreen({ navigation }) {
  const userEmail = auth.currentUser?.email;
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!userEmail) return;

  const chatsRef = collection(db, 'users', userEmail, 'chats');

  const unsubscribe = onSnapshot(chatsRef, () => {
    fetchChatSessions(); // fetch with every Firestore change
  });

  // Also fetch immediately and then every 5 minutes
  fetchChatSessions();
  const interval = setInterval(fetchChatSessions, 5 * 60 * 1000);

  return () => {
    unsubscribe(); // detach Firestore listener
    clearInterval(interval); // clear polling
  };
}, [userEmail]);


  const fetchChatSessions = async () => {
    setLoading(true);
    try {
      const chatsRef = collection(db, 'users', userEmail, 'chats');
      const snapshot = await getDocs(chatsRef);
      
      // Fetch first message for each chat to show preview
      const sessions = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const chatData = doc.data();
          
          // Get first message from this chat
          try {
            const messagesRef = collection(db, 'users', userEmail, 'chats', doc.id, 'messages');
            const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(1));
            const messagesSnapshot = await getDocs(messagesQuery);
            
            let firstMessage = null;
            if (!messagesSnapshot.empty) {
              const firstDoc = messagesSnapshot.docs[0];
              firstMessage = firstDoc.data();
            }

            return {
              id: doc.id,
              ...chatData,
              firstMessage: firstMessage
            };
          } catch (err) {
            console.error('Error fetching messages for chat:', doc.id, err);
            return {
              id: doc.id,
              ...chatData,
              firstMessage: null
            };
          }
        })
      );

      // Sort by lastUpdated (most recent first)
      sessions.sort((a, b) => {
        const aTime = a.lastUpdated?.toDate?.() || new Date(0);
        const bTime = b.lastUpdated?.toDate?.() || new Date(0);
        return bTime - aTime;
      });

      setChatSessions(sessions);
    } catch (err) {
      console.error('❌ Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chatId) => {
    navigation.navigate('Chat', { chatId, isExistingChat: true });
  };

  const getPreviewText = (firstMessage) => {
    if (!firstMessage || !firstMessage.content) {
      return "New conversation";
    }
    
    // Remove voice transcription emoji and quotes for cleaner preview
    let content = firstMessage.content.replace(/🎤\s*"([^"]*)"/, '$1').trim();
    
    // Truncate if too long
    if (content.length > 60) {
      content = content.substring(0, 60) + '...';
    }
    
    return content || "New conversation";
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown';
    
    const now = new Date();
    const chatTime = timestamp.toDate();
    const diffMs = now - chatTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return chatTime.toLocaleDateString();
  };

 const renderChatItem = ({ item }) => (
  <TouchableOpacity
    style={styles.chatCard}
    onPress={() => handleSelectChat(item.id)}
    activeOpacity={0.8}
  >
    <BlurView intensity={20} tint="dark" style={styles.chatCardBlur}>
      <View style={styles.chatCardContent}>
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubble-outline" size={24} color="#FF4800" />
        </View>

        <View style={styles.chatDetails}>
          <Text style={styles.chatPreview} numberOfLines={2}>
            {getPreviewText(item.firstMessage)}
          </Text>
          <View style={styles.chatMeta}>
            <Text style={styles.chatTime}>
              {getTimeAgo(item.lastUpdated)}
            </Text>
            {item.firstMessage?.isVoiceTranscription && (
              <View style={styles.voiceBadge}>
                <Ionicons name="mic" size={12} color="#FF4800" />
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => confirmDeleteChat(item.id)}
          style={styles.deleteIcon}
        >
          <Ionicons name="trash" size={20} color="#FF5C5C" />
        </TouchableOpacity>
      </View>
    </BlurView>
  </TouchableOpacity>
);


  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <LinearGradient
          colors={['#000000', '#000000', '#FF4800']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
              <Image 
                source={require('../assets/ekologo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </BlurView>
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4800" />
            <Text style={styles.loadingText}>Loading chat history...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#000000', '#FF4800']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <Image 
              source={require('../assets/ekologo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </BlurView>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="add" size={20} color="#FF4800" />
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Chat History</Text>
          <Text style={styles.subtitle}>
            {chatSessions.length} conversation{chatSessions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Chat List */}
        {chatSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Start a new chat to see your history here</Text>
            <TouchableOpacity 
              style={styles.startChatButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.startChatButtonText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chatSessions}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </LinearGradient>

      {/* Bottom Navigation */}
      <View style={styles.navbarContainer}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Chat')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
          <Text style={styles.navLabel}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('UserProfile')}
        >
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>

        <View style={styles.activeNavItemContainer}>
          <TouchableOpacity style={styles.activeNavItem}>
            <Ionicons name="time" size={24} color="#FF4800" />
            <Text style={styles.activeNavLabel}>HISTORY</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
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
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: '#FF4800',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  chatList: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  chatCard: {
    marginBottom: 12,
  },
  chatCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chatCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatDetails: {
    flex: 1,
  },
  chatPreview: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  voiceBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 30,
  },
  startChatButton: {
    backgroundColor: '#FF4800',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
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
});