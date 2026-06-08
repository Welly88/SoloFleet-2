import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  Mail,
  Lock,
  ArrowRight,
  Truck,
  Car,
  Plane,
  Bus,
  Sun,
  Moon,
} from "lucide-react-native";

import { useRouter } from "expo-router";
import { login } from "./api/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const radar = useRef(new Animated.Value(0)).current;

  const pulse = useRef(new Animated.Value(1)).current;

  const truck = useRef(
    new Animated.ValueXY({
      x: 80,
      y: -20,
    }),
  ).current;

  const car = useRef(
    new Animated.ValueXY({
      x: -80,
      y: 20,
    }),
  ).current;

  const plane = useRef(
    new Animated.ValueXY({
      x: 10,
      y: -90,
    }),
  ).current;

  const bus = useRef(
    new Animated.ValueXY({
      x: 0,
      y: 90,
    }),
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(radar, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    moveVehicle(truck, -50, 60);
    moveVehicle(car, 70, -40);
    moveVehicle(plane, -40, 80);
    moveVehicle(bus, 50, -70);
  }, []);

  function moveVehicle(anim, x, y) {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: { x, y },
          duration: 5000,
          useNativeDriver: true,
        }),

        Animated.timing(anim, {
          toValue: {
            x: Math.random() * 80 - 40,

            y: Math.random() * 80 - 40,
          },

          duration: 5000,

          useNativeDriver: true,
        }),
      ]),
    ).start();
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Isi email/password");

      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        router.replace("/pages/HomeScreen");
      }
    } catch {
      Alert.alert("Login gagal");
    }

    setLoading(false);
  }

  const theme = {
    bg: dark ? "#020617" : "#F8FAFC",

    card: dark ? "#0F172A" : "#fff",

    text: dark ? "#fff" : "#0F172A",

    border: dark ? "#334155" : "#CBD5E1",

    sub: dark ? "#94A3B8" : "#64748B",
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.bg,
      }}
    >
      {/* DARK MODE */}

      <View
        style={{
          position: "absolute",

          top: 60,
          right: 25,

          zIndex: 999,
        }}
      >
        <Pressable onPress={() => setDark(!dark)}>
          {dark ? <Sun color="#60A5FA" /> : <Moon color="#2563EB" />}
        </Pressable>
      </View>

      {/* ===================
      GPS RADAR
=================== */}

      <View
        style={{
          height: 320,

          justifyContent: "center",

          alignItems: "center",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",

            width: 260,
            height: 260,

            borderRadius: 999,

            backgroundColor: "rgba(59,130,246,.05)",

            transform: [{ scale: pulse }],
          }}
        />

        {[250, 190, 130, 70].map((s, i) => (
          <View
            key={i}
            style={{
              position: "absolute",

              width: s,
              height: s,

              borderRadius: 999,

              borderWidth: 1,

              borderColor: "rgba(96,165,250,.15)",
            }}
          />
        ))}

        <View
          style={{
            position: "absolute",

            width: 250,
            height: 1,

            backgroundColor: "rgba(96,165,250,.15)",
          }}
        />

        <View
          style={{
            position: "absolute",

            width: 1,
            height: 250,

            backgroundColor: "rgba(96,165,250,.15)",
          }}
        />

        {/* radar line */}

        <Animated.View
          style={{
            position: "absolute",

            width: 250,
            height: 250,

            transform: [
              {
                rotate: radar.interpolate({
                  inputRange: [0, 1],

                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              position: "absolute",

              top: "50%",
              left: "50%",

              width: 120,
              height: 2,

              backgroundColor: "#60A5FA",

              shadowColor: "#60A5FA",

              shadowOpacity: 1,

              shadowRadius: 15,
            }}
          />
        </Animated.View>

        {/* VEHICLE */}

        <Animated.View
          style={{
            position: "absolute",

            transform: truck.getTranslateTransform(),
          }}
        >
          <Truck size={28} color="#60A5FA" />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",

            transform: car.getTranslateTransform(),
          }}
        >
          <Car size={28} color="#3B82F6" />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",

            transform: plane.getTranslateTransform(),
          }}
        >
          <Plane size={28} color="#2563EB" />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",

            transform: bus.getTranslateTransform(),
          }}
        >
          <Bus size={28} color="#1D4ED8" />
        </Animated.View>

        <Animated.View
          style={{
            width: 20,
            height: 20,

            borderRadius: 999,

            backgroundColor: "#2563EB",

            transform: [{ scale: pulse }],
          }}
        />
      </View>

      {/* ===================
      LOGIN CARD
=================== */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,

          justifyContent: "flex-end",

          marginTop: -35,
        }}
      >
        <View
          style={{
            backgroundColor: theme.card,

            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,

            padding: 28,

            minHeight: 420,
          }}
        >
          {/* HEADER */}

          <View
            style={{
              alignItems: "center",

              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 30,

                fontWeight: "800",

                letterSpacing: 1,

                color: theme.text,
              }}
            >
              SOLO
              <Text
                style={{
                  color: "#3B82F6",
                }}
              >
                {" "}
                SYSTEM
              </Text>
            </Text>

            <Text
              style={{
                fontSize: 12,

                marginTop: 5,

                color: theme.sub,
              }}
            >
              Fleet Monitoring Platform
            </Text>
          </View>

          <View
            style={{
              height: 1,

              backgroundColor: "rgba(148,163,184,.15)",

              marginVertical: 14,
            }}
          />

          <Text
            style={{
              fontSize: 15,
              padding:10,
              fontWeight: "500",

              color: theme.text,
            }}
          >
            Login Account
          </Text>


          <View
            style={{
              borderWidth: 1,

              borderColor: theme.border,

              padding: 14,

              borderRadius: 18,

              flexDirection: "row",

              alignItems: "center",
            }}
          >
            <Mail color="gray" />

            <TextInput
              placeholder="Email"
              placeholderTextColor="gray"
              value={email}
              onChangeText={setEmail}
              style={{
                flex: 1,

                marginLeft: 10,

                color: theme.text,
              }}
            />
          </View>

          <View
            style={{
              borderWidth: 1,

              borderColor: theme.border,

              padding: 14,

              borderRadius: 18,

              marginTop: 16,

              flexDirection: "row",

              alignItems: "center",
            }}
          >
            <Lock color="gray" />

            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="gray"
              value={password}
              onChangeText={setPassword}
              style={{
                flex: 1,

                marginLeft: 10,

                color: theme.text,
              }}
            />
          </View>

          <Pressable onPress={handleLogin}>
            <View
              style={{
                backgroundColor: "#2563EB",

                padding: 16,

                borderRadius: 18,

                marginTop: 20,

                justifyContent: "center",

                alignItems: "center",

                flexDirection: "row",
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text
                    style={{
                      color: "white",

                      fontWeight: "700",

                      fontSize: 16,

                      marginRight: 8,
                    }}
                  >
                    Sign In
                  </Text>

                  <ArrowRight color="white" />
                </>
              )}
            </View>
          </Pressable>

          <Text
            style={{
              textAlign: "center",

              fontSize: 11,

              marginTop: 18,

              color: theme.sub,
            }}
          >
            Version 1.0.0
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
