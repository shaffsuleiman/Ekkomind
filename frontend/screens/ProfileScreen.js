// ProfileScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  Image, ActivityIndicator, Platform, StatusBar, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const uid = user?.uid;

  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editedName, setEditedName] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedGender, setEditedGender] = useState('');

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  // Calculate navbar height
  const navbarHeight = Platform.select({ 
    ios: 80, 
    android: 70 + insets.bottom 
  });
  const bottomPadding = Math.max(insets.bottom, 16);

  useEffect(() => {
    if (uid) fetchUserDetails();
  }, [uid]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setEditedName(data.name || '');
        setEditedAge(data.age ? String(data.age) : '');
        setEditedGender(data.gender || '');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        name: editedName.trim(),
        age: editedAge ? parseInt(editedAge, 10) : null,
        gender: editedGender.trim(),
        lastUpdated: new Date(),
      });
      setEditing(false);
      fetchUserDetails();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Camera roll permission is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    try {
      setUploading(true);
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `profilePictures/${uid}_${Date.now()}.jpg`);
      await uploadBytes(imageRef, blob);
      const download = await getDownloadURL(imageRef);
      await updateDoc(doc(db, 'users', uid), {
        profilePicture: download,
        lastUpdated: new Date(),
      });
      setUserData(prev => ({ ...prev, profilePicture: download }));
      Alert.alert('Success', 'Profile picture updated');
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
            } catch (err) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={['#000000', '#000000', '#FF4800']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.9 }}
          style={[styles.gradient, { paddingTop: insets.top }]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4800" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <LinearGradient
        colors={['#000000', '#000000', '#FF4800']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.9 }}
        style={[styles.gradient, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../assets/ekologo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Main Content */}
        <View style={[styles.content, { paddingBottom: navbarHeight + 20 }]}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={handlePickAndUploadImage}
              disabled={uploading}
              style={styles.avatarContainer}
              activeOpacity={0.8}
            >
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}
              <Image
                source={
                  userData?.profilePicture
                    ? { uri: userData.profilePicture }
                    : require('../assets/profileavatar.png')
                }
                style={styles.avatar}
              />
              <View style={styles.editButton}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{userData?.email || user?.email}</Text>
            </View>
          </View>

          {/* Quick Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="calendar-outline" size={20} color="#FF4800" />
              <Text style={styles.infoValue}>{userData?.age || '--'}</Text>
              <Text style={styles.infoLabel}>Age</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="transgender-outline" size={20} color="#FF4800" />
              <Text style={styles.infoValue}>{userData?.gender || '--'}</Text>
              <Text style={styles.infoLabel}>Gender</Text>
            </View>
          </View>

          {/* Edit Mode */}
          {editing && (
            <View style={styles.editSection}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
                <TextInput
                  style={[styles.input, styles.ageInput]}
                  value={editedAge}
                  onChangeText={setEditedAge}
                  placeholder="Age"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              
              <View style={styles.genderRow}>
                {genderOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderChip,
                      editedGender === option && styles.genderChipSelected
                    ]}
                    onPress={() => setEditedGender(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.genderText,
                      editedGender === option && styles.genderTextSelected
                    ]}>
                      {option === 'Prefer not to say' ? 'Other' : option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {editing ? (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setEditing(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleUpdate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mainActions}>
                <TouchableOpacity 
                  style={styles.editProfileBtn} 
                  onPress={() => setEditing(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.editText}>Edit Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.historyBtn}
                  onPress={() => navigation.navigate('ChatHistory')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.historyText}>History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.signOutBtn} 
                  onPress={handleSignOut}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={[styles.bottomNavbar, { height: navbarHeight, paddingBottom: bottomPadding }]}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>CHAT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.navItem, styles.activeNavItem]} activeOpacity={0.7}>
            <Ionicons name="person" size={24} color="#FF4800" />
            <Text style={[styles.navLabel, styles.activeNavLabel]}>PROFILE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('ChatHistory')}
            activeOpacity={0.7}
          >
            <Ionicons name="time" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>HISTORY</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logo: { 
    height: 30, 
    width: 60 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    color: '#FFFFFF', 
    marginTop: 10, 
    fontSize: 16 
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Profile Section - Compact
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FF4800',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF4800',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // Info Grid - Compact
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Edit Section - Compact
  editSection: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 0, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ageInput: {
    flex: 0.3,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  genderChip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderChipSelected: {
    backgroundColor: '#FF4800',
    borderColor: '#FF4800',
  },
  genderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  genderTextSelected: {
    fontWeight: '700',
  },

  // Action Section - Compact
  actionSection: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#FF4800',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mainActions: {
    gap: 10,
  },
  editProfileBtn: {
    backgroundColor: '#FF4800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  historyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  signOutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Bottom Navigation
  bottomNavbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 5,
    minHeight: 44,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
  activeNavItem: {
    // Additional styles for active nav item if needed
  },
  activeNavLabel: {
    color: '#FF4800',
  },
});