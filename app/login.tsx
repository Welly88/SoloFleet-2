import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { login } from "./api/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("leocoldspace@solofleet.com");
  const [password, setPassword] = useState("cs123456");
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.replace("/HomeScreen");
    } else {
      Alert.alert("Login Gagal", result.message);
    }
  };

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Tidak dapat membuka link");
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/images/solo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Solo System</Text>
            <Text style={styles.subtitle}>One Stop AI Solution</Text>
          </View>

          {/* Card Form Login */}
          <View style={styles.card}>

            {/* Input Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Masukkan username"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholderTextColor="#CBD5E1"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Masukkan password"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#CBD5E1"
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tombol Login */}
            <TouchableOpacity
              style={styles.btn}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <View style={styles.linkContainer}>
              <TouchableOpacity
                style={{ marginRight: 24 }}
                onPress={() =>
                  openLink("https://www.solofleet.com/Home/soloprivacypolicy")
                }
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openLink("https://solosystem.net/")}
              >
                <Text style={styles.linkText}>Contact Us</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  headerSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    // Shadow lembut untuk logo
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  logo: {
  width: "100%",
  height: "100%",
  borderRadius: 55,
},
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2D3436", 
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#636E72", // Abu-abu medium
    marginTop: 4,
    fontWeight: "500",
  },

  // --- CARD FORM ---
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    // Shadow modern
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 24,
    textAlign: "center",
  },

  // --- INPUT ---
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#636E72",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: "#ECEEf0",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#2D3436",
    fontSize: 15,
    fontWeight: "500",
  },
  eyeIcon: {
    padding: 4,
  },

  btn: {
    backgroundColor: "#27AE60",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#27AE60",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },

  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    width: "60%",
    backgroundColor: "#E0E0E0",
    marginBottom: 20,
    opacity: 0.5,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginBottom: 12,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B0BEC5",
    marginHorizontal: 12,
  },
  linkText: {
    color: "#636E72",
    fontSize: 13,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 12,
    color: "#B0BEC5",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});
