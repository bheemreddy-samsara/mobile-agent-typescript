import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

type Screen = 'Login' | 'Home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {screen === 'Login' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            accessibilityLabel="email-input"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="password-input"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <TouchableOpacity
            accessibilityLabel="login-button"
            style={styles.button}
            onPress={() => setScreen('Home')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.subtitle}>Logged in as {email || 'user'}</Text>

          <TouchableOpacity
            accessibilityLabel="settings-button"
            style={[styles.button, styles.secondary]}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="logout-button"
            style={styles.button}
            onPress={() => setScreen('Login')}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 24, justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 8 },
  button: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  secondary: { backgroundColor: '#5856D6' },
  buttonText: { color: 'white', fontWeight: '600' }
});

