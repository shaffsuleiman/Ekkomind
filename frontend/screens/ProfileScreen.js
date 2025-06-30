import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, SafeAreaView, TouchableOpacity,
  Alert, StyleSheet, Image, ScrollView, ActivityIndicator, Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const uid = user?.uid;
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [editedName, setEditedName] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedGender, setEditedGender] = useState('');

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  useEffect(() => {
    if (uid) fetchUserDetails();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [uid]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
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
        age: editedAge ? parseInt(editedAge) : null,
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
      quality: 0.8
    });

    if (result.canceled) return;

    try {
      setUploading(true);
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `profilePictures/${uid}_${Date.now()}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      await updateDoc(doc(db, 'users', uid), {
        profilePicture: downloadURL,
        lastUpdated: new Date()
      });
      setUserData(prev => ({ ...prev, profilePicture: downloadURL }));
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
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.signOut();
            // No need to navigate - auth state change will handle it
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        }
      },
    ]
  );
};


  return (
    <LinearGradient
          colors={['#000000', '#000000', '#FF4800']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.gradient}
        >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/ekologo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4800" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              <TouchableOpacity
                onPress={handlePickAndUploadImage}
                disabled={uploading}
                style={styles.avatarContainer}
              >
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
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
                <View style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <Text style={styles.userName}>{userData?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{userData?.email || user?.email}</Text>
              <Text style={styles.userRole}>Ekomind User</Text>
            </View>

            <View style={styles.settingsContainer}>
              {editing ? (
                <>
                  <Text style={styles.sectionTitle}>Edit Profile</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder="Your name"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      value={editedAge}
                      onChangeText={setEditedAge}
                      keyboardType="numeric"
                      placeholder="Your age"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={styles.genderOptions}>
                      {genderOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.genderOption,
                            editedGender === option && styles.genderOptionSelected
                          ]}
                          onPress={() => setEditedGender(option)}
                        >
                          <Text style={[
                            styles.genderOptionText,
                            editedGender === option && styles.genderOptionTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                      <Text style={styles.cancelButtonText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                      <Text style={styles.saveButtonText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Account Information</Text>
                  <View style={styles.infoItem}>
                    <Ionicons name="person" size={20} color="#FF4800" style={styles.infoIconContainer} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>{userData.name || 'Not set'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="mail" size={20} color="#FF4800" style={styles.infoIconContainer} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{userData.email || user?.email}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar" size={20} color="#FF4800" style={styles.infoIconContainer} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Age</Text>
                      <Text style={styles.infoValue}>{userData.age || 'Not set'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="transgender" size={20} color="#FF4800" style={styles.infoIconContainer} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Gender</Text>
                      <Text style={styles.infoValue}>{userData.gender || 'Not set'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.editProfileButton} onPress={() => setEditing(true)}>
                    <Text style={styles.editProfileText}>EDIT PROFILE</Text>
                  </TouchableOpacity>

                </>
              )}
            </View>
          </ScrollView>
        )}

        {!keyboardVisible && (
          <View style={styles.navbarContainer}>
            <TouchableOpacity
              style={styles.activeNavItemContainer}
            >
              <Ionicons name="person" size={24} color="#FF4800" />
              <Text style={styles.activeNavLabel}>PROFILE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
              <Text style={styles.navLabel}>CHAT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('ChatHome')}
            >
              <Ionicons name="home-outline" size={24} color="#FFFFFF" />
              <Text style={styles.navLabel}>HOME</Text>
            </TouchableOpacity>
        </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logo: { height: 30, width: 60 },
  content: { flex: 1, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', marginTop: 10, fontSize: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: 30 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FF4800' },
  uploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 50, justifyContent: 'center', alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#FF4800', width: 30, height: 30,
    borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  userName: { fontSize: 22, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  userRole: { fontSize: 14, color: '#FF4800', fontWeight: '500' },
  settingsContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#FFFFFF', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#FF4800', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, color: '#FFFFFF'
  },
  genderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderOption: {
    borderWidth: 1, borderColor: '#FF4800',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    marginRight: 8, marginTop: 8,
  },
  genderOptionSelected: { backgroundColor: '#FF4800' },
  genderOptionText: { color: '#FFFFFF' },
  genderOptionTextSelected: { color: '#000000', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: {
    backgroundColor: '#444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  cancelButtonText: { color: '#FFFFFF' },
  saveButton: {
    backgroundColor: '#FF4800', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIconContainer: { marginRight: 10 },
  infoContent: {},
  infoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  infoValue: { color: '#FFFFFF', fontSize: 14 },
  editProfileButton: {
    backgroundColor: '#FF4800', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center',
  },
  editProfileText: { color: '#FFFFFF', fontWeight: '600' },
  signOutButton: {
    backgroundColor: '#222', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center',
  },
  signOutText: { color: '#FFFFFF', fontWeight: '600' },
  // Bottom Navbar Styles
  navbarContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
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
    paddingTop: 8,
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
