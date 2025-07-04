//screens/EmailVerifyPending.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { auth } from '../firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function EmailVerifyPending({ navigation }) {
  const [checking, setChecking] = useState(false);

  const reloadAndCheck = async () => {
    try {
      setChecking(true);
      await auth.currentUser.reload();         // refresh the local user
      if (auth.currentUser.emailVerified) {
        // ✅ verified – take them to the real app flow
        navigation.reset({ index: 0, routes: [{ name: 'UserInfo' }] });
      } else {
        Alert.alert('Not yet verified', 'Please click the link in your e-mail first.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <LinearGradient
      colors={['#000000', '#000000', '#FF4800']}
      locations={[0, 0.6, 1]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Ionicons name="mail-open" size={64} color="#FF4800" />
        <Text style={styles.text}>
          Check your inbox and tap the verification link we just sent you.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={reloadAndCheck} disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#8B0000" />
          ) : (
            <Text style={styles.btnText}>I’m Verified</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 24,
  },
  btn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  btnText: {
    color: '#8B0000',
    fontWeight: '600',
    fontSize: 16,
  },
});
