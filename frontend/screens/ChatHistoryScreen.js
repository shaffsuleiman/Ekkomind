// ChatHistoryScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Image, Platform, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  collection, getDocs, query, orderBy, limit,
  deleteDoc, doc, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- utility: delete chat & confirmation ---------- */
const deleteChatSession = async (chatId) => {
  try {
    const userEmail   = auth.currentUser?.email;
    const chatRef     = doc(db, 'users', userEmail, 'chats', chatId);
    const messagesRef = collection(db, 'users', userEmail, 'chats', chatId, 'messages');

    const messageDocs = await getDocs(messagesRef);
    await Promise.all(messageDocs.docs.map(d => deleteDoc(d.ref))); // delete messages
    await deleteDoc(chatRef);                                       // delete chat doc
  } catch (err) {
    console.error('Failed to delete chat:', err);
    Alert.alert('Error', 'Failed to delete chat');
  }
};

const confirmDeleteChat = (chatId) => {
  Alert.alert(
    'Delete Chat',
    'Are you sure you want to permanently delete this chat?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteChatSession(chatId) },
    ]
  );
};

/* ---------- main component ---------- */
export default function ChatHistoryScreen({ navigation }) {
  const insets            = useSafeAreaInsets();
  const userEmail         = auth.currentUser?.email;

  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading]           = useState(true);

  /* ---------- layout helpers ---------- */
  const navbarHeight  = Platform.select({ ios: 80, android: 70 + insets.bottom });
  const bottomPadding = Math.max(insets.bottom, 16);

  /* ---------- Firestore listeners ---------- */
  useEffect(() => {
    if (!userEmail) return;

    const chatsRef   = collection(db, 'users', userEmail, 'chats');
    const unsubSnap  = onSnapshot(chatsRef, fetchChatSessions);

    // extra polling every 5 min in case of missed events
    fetchChatSessions();
    const interval = setInterval(fetchChatSessions, 5 * 60 * 1000);

    return () => {
      unsubSnap();
      clearInterval(interval);
    };
  }, [userEmail]);

  const fetchChatSessions = async () => {
    setLoading(true);
    try {
      const chatsRef  = collection(db, 'users', userEmail, 'chats');
      const snapshot  = await getDocs(chatsRef);

      const sessions = await Promise.all(
        snapshot.docs.map(async (d) => {
          const chatData = d.data();

          // first message preview
          let firstMessage = null;
          try {
            const msgRef  = collection(db, 'users', userEmail, 'chats', d.id, 'messages');
            const msgSnap = await getDocs(query(msgRef, orderBy('timestamp', 'asc'), limit(1)));
            if (!msgSnap.empty) firstMessage = msgSnap.docs[0].data();
          } catch { /** ignore */ }

          return { id: d.id, ...chatData, firstMessage };
        })
      );

      sessions.sort((a, b) => {
        const at = a.lastUpdated?.toDate?.() ?? new Date(0);
        const bt = b.lastUpdated?.toDate?.() ?? new Date(0);
        return bt - at;
      });

      setChatSessions(sessions);
    } catch (err) {
      console.error('❌ Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- helpers ---------- */
  const handleSelectChat = (chatId) =>
    navigation.navigate('Chat', { chatId, isExistingChat: true });

  const getPreviewText = (msg) => {
    if (!msg?.content) return 'New conversation';
    let txt = msg.content.replace(/🎤\s*"([^"]*)"/, '$1').trim();
    if (txt.length > 60) txt = `${txt.slice(0, 60)}…`;
    return txt || 'New conversation';
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown';
    const now = Date.now();
    const then = timestamp.toDate().getTime();
    const diffM = Math.floor((now - then) / 6e4);      // minutes
    const diffH = Math.floor(diffM / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffM < 1)  return 'Just now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7)  return `${diffD}d ago`;
    return new Date(then).toLocaleDateString();
  };

  /* ---------- list item ---------- */
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleSelectChat(item.id)}
      activeOpacity={0.8}
    >
      <BlurView style={styles.chatCardBlur} intensity={20} tint="dark">
        <View style={styles.chatCardContent}>
          <View style={styles.chatIcon}>
            <Ionicons name="chatbubble-outline" size={24} color="#FF4800" />
          </View>

          <View style={styles.chatDetails}>
            <Text style={styles.chatPreview} numberOfLines={2}>
              {getPreviewText(item.firstMessage)}
            </Text>
            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>{getTimeAgo(item.lastUpdated)}</Text>
              {item.firstMessage?.isVoiceTranscription && (
                <View style={styles.voiceBadge}>
                  <Ionicons name="mic" size={12} color="#FF4800" />
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => confirmDeleteChat(item.id)} style={styles.deleteIcon}>
            <Ionicons name="trash" size={20} color="#FF5C5C" />
          </TouchableOpacity>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  /* ---------- loading ui ---------- */
  if (loading) {
    return (
      <LinearGradient
        colors={['#000000', '#000000', '#FF4800']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.gradient}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <Image source={require('../assets/ekologo.png')} style={styles.logo} resizeMode="contain" />
          </BlurView>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4800" />
          <Text style={styles.loadingText}>Loading chat history…</Text>
        </View>
      </LinearGradient>
    );
  }

  /* ---------- main ui ---------- */
  return (
    <LinearGradient
      colors={['#000000', '#000000', '#FF4800']}
      locations={[0, 0.4, 1]}
      start={{ x: 0, y: 0.2 }}
      end={{ x: 1, y: 0.9 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ---- header ---- */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
          <Image source={require('../assets/ekologo.png')} style={styles.logo} resizeMode="contain" />
        </BlurView>
      </View>

      {/* ---- nav buttons ---- */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.newChatButton} onPress={() => navigation.navigate('Chat')}>
          <Ionicons name="add" size={20} color="#FF4800" />
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* ---- title ---- */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Chat History</Text>
        <Text style={styles.subtitle}>
          {chatSessions.length} conversation{chatSessions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ---- list / empty ---- */}
      {chatSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={80} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a new chat to see your history here
          </Text>
          <TouchableOpacity style={styles.startChatButton} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.startChatButtonText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chatSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: navbarHeight + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ---- bottom nav ---- */}
      <View
        style={[
          styles.navbarContainer,
          { height: navbarHeight, paddingBottom: bottomPadding },
        ]}
      >
        <NavItem
          icon="chatbubble-outline"
          label="CHAT"
          onPress={() => navigation.navigate('Chat')}
        />
        <NavItem
          icon="person-outline"
          label="PROFILE"
          onPress={() => navigation.navigate('UserProfile')}
        />
        <NavItem icon="time" label="HISTORY" active />
      </View>
    </LinearGradient>
  );
}

/* ---------- small components ---------- */
const NavItem = ({ icon, label, onPress = () => {}, active = false }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={24} color={active ? '#FF4800' : '#FFFFFF'} />
    <Text style={[styles.navLabel, active && styles.activeNavLabel]}>{label}</Text>
  </TouchableOpacity>
);

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  /* header */
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  logo: { height: 30, width: 60 },

  /* nav buttons under header */
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
  buttonText: { color: '#FFFFFF', fontSize: 14, marginLeft: 4, fontWeight: '500' },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderWidth: 1, borderColor: 'rgba(255, 72, 0, 0.4)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: { color: '#FF4800', fontSize: 14, marginLeft: 4, fontWeight: '500' },

  /* title */
  titleContainer: { paddingHorizontal: 20, paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },

  /* list / card */
  chatCard: { marginBottom: 12 },
  chatCardBlur: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chatCardContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  chatIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderWidth: 1, borderColor: 'rgba(255, 72, 0, 0.4)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  chatDetails: { flex: 1 },
  chatPreview: { fontSize: 16, color: '#FFFFFF', marginBottom: 6, lineHeight: 22 },
  chatMeta: { flexDirection: 'row', alignItems: 'center' },
  chatTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  voiceBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 72, 0, 0.2)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },

  /* empty state */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 30 },
  startChatButton: {
    backgroundColor: '#FF4800',
    paddingHorizontal: 30, paddingVertical: 12,
    borderRadius: 25,
  },
  startChatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  /* loading */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16, marginTop: 16 },

  /* bottom nav */
  navbarContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    position: 'absolute', left: 0, right: 0, bottom: 0,
    justifyContent: 'space-around', alignItems: 'flex-start',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  navLabel: { color: '#FFFFFF', fontSize: 10, marginTop: 4 },
  activeNavLabel: { color: '#FF4800' },
});
