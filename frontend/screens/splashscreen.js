// frontend/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomSplashScreen({ navigation }) {
  useEffect(() => {
    const prepare = async () => {
      try {
        // Simulate loading time (e.g., font/data fetch)
        await new Promise(res => setTimeout(res, 1500));
      } finally {
        // navigation.replace('ChatHome'); // Navigate to your main screen
      }
    };
    prepare();
  }, []);

  return (
    <LinearGradient
              colors={['#000000', '#000000', '#FF4800']}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.9 }}
              style={styles.container}
        >
      <Image
        source={require('../assets/ekologo1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 60,
  },
});
