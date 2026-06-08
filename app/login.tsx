

import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import { login } from "./api/auth";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("juragan99@solofleet.com");

  const [password, setPassword] = useState("Administrator2026");

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    const result = await login(email, password);

    console.log("LOGIN RESULT:", result);

    setLoading(false);

    if (result.success) {
      router.replace("/HomeScreen");
    } else {
      Alert.alert("Login gagal", result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SoloFleet</Text>

      <TextInput
        placeholder="
Username"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="
Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    justifyContent: "center",

    padding: 20,

    backgroundColor: "#fff",
  },

  title: {
    fontSize: 35,

    fontWeight: "700",

    textAlign: "center",

    marginBottom: 50,
  },

  input: {
    borderWidth: 1,

    borderColor: "#ddd",

    padding: 15,

    marginBottom: 15,

    borderRadius: 10,
  },

  btn: {
    backgroundColor: "#2563EB",

    padding: 16,

    borderRadius: 10,

    alignItems: "center",
  },

  btnText: {
    color: "white",

    fontWeight: "700",
  },
});


