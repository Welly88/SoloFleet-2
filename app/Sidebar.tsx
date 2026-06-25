import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "react-native";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(width * 0.60, 300);

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  activeMenu: string;
  onMenuSelect: (id: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  activeMenu,
  onMenuSelect,
  onLogout,
}) => {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const [openReport, setOpenReport] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender) {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    const reportSubItems = ["dailyReport", "intervention", "analytic", "feature"];
    if (reportSubItems.includes(activeMenu)) {
      setOpenReport(true);
    }
  }, [activeMenu]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible]);

  if (!shouldRender) return null;

  const handleMenuPress = (id: string, route?: string, isLogout = false) => {
    if (isLogout) {
      onLogout();
    } else if (route) {
      if (route === "/HomeScreen" && activeMenu === "dashboard") {
        onClose();
        return;
      }
      router.push(route as any);
      onMenuSelect(id);
    } else {
      onMenuSelect(id);
    }
    onClose();
  };

  const renderMenuItem = (
    id: string,
    label: string,
    iconName: keyof typeof Ionicons.glyphMap,
    isLogout = false,
    route?: string
  ) => {
    const isActive = activeMenu === id;
    const color = isLogout ? "#DC2626" : isActive ? "#2563EB" : "#374151";

    return (
      <TouchableOpacity
        key={id}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => handleMenuPress(id, route, isLogout)}
        activeOpacity={0.7}
      >
        <Ionicons name={iconName} size={20} color={color} style={styles.menuIcon} />
        <Text style={[styles.menuLabel, { color, fontWeight: isActive ? "700" : "500" }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: slideAnim.interpolate({
                inputRange: [-SIDEBAR_WIDTH, 0],
                outputRange: [0, 1],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
        {/* ── Header ── */}
        <View style={styles.headerSidebar}>
           <Image
    source={require("../assets/images/solofleet.jpeg")}
    style={styles.logo}
  />
        </View>

        {/* ── Menu List (scrollable area) ── */}
                  <View style={styles.footerSeparator} />
        <View style={styles.menuList}>
          {renderMenuItem("dashboard", "Home Page", "home", false, "/HomeScreen")}
                        {renderMenuItem("dailyReport", "Daily Report", "calendar", false, "/DailyReportScreen")}
              {renderMenuItem("intervention", "Intervention", "warning", false, "/InterventionScreen")}
              {renderMenuItem("analytic", "DMS Analytic", "bar-chart", false, "/DmsAnalyticScreen")}
              {renderMenuItem("feature", "Feature", "grid", false, "/FeatureScreen")}

          {/* <TouchableOpacity style={styles.menuItem} onPress={() => setOpenReport(!openReport)}>
            <Ionicons name="document-text" size={20} color="#374151" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Report</Text>
            <Ionicons
              name={openReport ? "chevron-up" : "chevron-down"}
              size={16}
              color="#9CA3AF"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity> */}

          

          {/* {openReport && (
            <View style={styles.subMenu}>

            </View>
          )} */}
        </View>

        {/* ── Footer (Keluar) ── */}
        <View style={styles.footerSidebar}>
          {/* <View style={styles.footerSeparator} /> */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => handleMenuPress("logout", undefined, true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.menuIcon} />
            <Text style={styles.logoutLabel}>Keluar</Text>
          </TouchableOpacity>
          <View style={styles.footerSeparator} />
          <Text style={styles.footerVersion}>Solo Fleet</Text>
          <Text style={styles.footerVersion}>V 1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sidebarContainer: {
    position: "absolute",
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: "#FFF",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    // penting: biar footer nempel bawah
    flexDirection: "column",
  },

  /* ── Header ── */
headerSidebar: {
  paddingTop: 16,
  paddingBottom: 0,
  paddingHorizontal: 16,
  alignItems: "center",
},
  appName: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    color: "#111827",
  },
  appSub: {
    color: "#9CA3AF",
    marginTop: 2,
    fontSize: 11,
  },

  /* ── Menu ── */
menuList: {
  flex: 1,
  paddingHorizontal: 8,
  paddingTop: 0,
},
  menuItem: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 10,
  paddingHorizontal: 11,
  borderRadius: 10,
  marginBottom: 2,
},
 logo: {
  width: 200,
  height: 200,
  resizeMode: "contain",
},
  menuItemActive: {
    backgroundColor: "#EFF6FF",
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 12,
    color: "#374151",
    flexShrink: 1,
  },
  subMenu: {
    marginLeft: 10,
    borderLeftWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingLeft: 8,
    marginTop: 2,
    marginBottom: 2,
  },

  /* ── Footer ── */
  footerSidebar: {
    paddingBottom: 28,
    paddingTop: 4,
    paddingHorizontal: 12,
  },
  footerSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    borderRadius: 10,
  },
  logoutLabel: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  footerVersion: {
    fontSize: 10,
    color: "#D1D5DB",
    textAlign: "center",
    marginTop: 12,
  },
});

export default Sidebar;