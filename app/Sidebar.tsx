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

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75;

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
      // FIX: Gunakan router.push agar halaman sebelumnya (Home) tetap ada di stack
      // Cek jika sudah di Home dan klik Home lagi, jangan push
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
        <Ionicons name={iconName} size={22} color={color} style={styles.menuIcon} />
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
        <View style={styles.headerSidebar}>
          <Ionicons name="cube-outline" size={48} color="#2563EB" />
          <Text style={styles.appName}>Development</Text>
          <Text style={styles.appSub}>Version 1.0.0</Text>
        </View>

        <View style={styles.menuList}>
          {renderMenuItem("dashboard", "Home Page", "home", false, "/HomeScreen")}

          <TouchableOpacity style={styles.menuItem} onPress={() => setOpenReport(!openReport)}>
            <Ionicons name="document-text" size={22} color="#374151" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Report</Text>
            <Ionicons
              name={openReport ? "chevron-up" : "chevron-down"}
              size={18}
              color="#9CA3AF"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>

          {openReport && (
            <View style={styles.subMenu}>
              {renderMenuItem("dailyReport", "Daily Report", "calendar", false, "/DailyReportScreen")}
              {renderMenuItem("intervention", "Intervention Report", "warning", false, "/InterventionScreen")}
              {renderMenuItem("analytic", "DMS Analytic", "bar-chart", false, "/DmsAnalyticScreen")}
              {renderMenuItem("feature", "Feature", "grid", false, "/FeatureScreen")}
            </View>
          )}

          <View style={styles.separator} />
          {renderMenuItem("logout", "Keluar", "log-out", true)}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: "absolute", width: "100%", height: "100%", zIndex: 999, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sidebarContainer: {
    position: "absolute", width: SIDEBAR_WIDTH, height: "100%", backgroundColor: "#FFF", elevation: 20,
    shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10,
  },
  headerSidebar: { padding: 24, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", alignItems: "center", paddingTop: 40 },
  appName: { fontSize: 20, fontWeight: "700", marginTop: 10, color: "#111827" },
  appSub: { color: "#9CA3AF", marginTop: 4, fontSize: 12 },
  menuList: { padding: 12, flex: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 4 },
  menuItemActive: { backgroundColor: "#EFF6FF" },
  menuIcon: { marginRight: 14 },
  menuLabel: { fontSize: 15, color: "#374151" },
  subMenu: { marginLeft: 12, borderLeftWidth: 1.5, borderColor: "#E5E7EB", paddingLeft: 8, marginTop: 4, marginBottom: 4 },
  separator: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
});

export default Sidebar;