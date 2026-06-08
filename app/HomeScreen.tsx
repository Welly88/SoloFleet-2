import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  ListRenderItem,
  Keyboard,
  ScrollView,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { getVehicleData, logout, getCompanyId } from "./api/auth";
import Sidebar from "./Sidebar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Feather } from "@expo/vector-icons";

interface Vehicle {
  vehicleid: string;
  alias?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  speed?: number;
  gpstime?: string;
  IP1?: number | string;
  temp1?: number | string | null;
  temp2?: number | string | null;
  door?: string;
  stn?: string;
  subd?: string;
  dnm?: string;
  City?: string;
  Province?: string;
  zonename?: string;
}

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  engine: number;
  speed: number;
  temp1: number | null;
  temp2: number | null;
}

interface HomeScreenProps {
  onLogout: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<Vehicle[]>([]);
  const [filteredData, setFilteredData] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [isTableVisible, setIsTableVisible] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const webViewRef = useRef<WebView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [selectedTemps, setSelectedTemps] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setActiveMenu("dashboard");
    }, []),
  );

  useEffect(() => {
    const lockPortrait = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    };
    lockPortrait();
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const companyId = await getCompanyId();
        if (companyId) setUserCompanyId(String(companyId));
        else setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
      }
    };
    loadCompanyId();
  }, []);

  useEffect(() => {
    if (userCompanyId) {
      fetchData();
      intervalRef.current = setInterval(() => {
        fetchData();
      }, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userCompanyId]);

  // --- Logika Filter Utama ---
  useEffect(() => {
    let result = data;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.alias?.toLowerCase().includes(term) ||
          item.vehicleid?.toLowerCase().includes(term),
      );
    }

    if (selectedEngines.length > 0) {
      result = result.filter((item) => {
        const status = parseInt(String(item.IP1), 10) === 1 ? "on" : "off";
        return selectedEngines.includes(status);
      });
    }

    if (selectedTemps.length > 0) {
      result = result.filter((item) => {
        const t1 =
          item.temp1 != null ? parseFloat(String(item.temp1)) : Infinity;
        const t2 =
          item.temp2 != null ? parseFloat(String(item.temp2)) : Infinity;

        if (t1 === Infinity && t2 === Infinity) return false;

        const minTemp = Math.min(t1, t2);
        let category = "";

        if (minTemp > -15) category = "frozen";
        else if (minTemp >= -15 && minTemp <= 0) category = "cold";
        else if (minTemp > 0 && minTemp <= 15) category = "cool";
        else category = "warm";

        return selectedTemps.includes(category);
      });
    }

    setFilteredData(result);
  }, [data, searchTerm, selectedEngines, selectedTemps]);

  const toggleFilter = (
    stateArray: string[],
    value: string,
    setter: Function,
  ) => {
    if (value === "all") {
      setter([]);
      return;
    }

    if (stateArray.includes(value)) {
      setter(stateArray.filter((item) => item !== value));
    } else {
      setter([...stateArray, value]);
    }
  };

  const getSafeCoord = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = parseFloat(String(val));
    return isNaN(num) ? null : num;
  };

  const fetchData = async () => {
    try {
      const result = await getVehicleData();
      if (result.success) {
        setData(result.data);
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP,
          );
          onLogout();
        },
      },
    ]);
  };

  const getMapMarkers = (): MapMarker[] => {
    return filteredData
      .map((item) => {
        const lat = getSafeCoord(item.latitude ?? item.lat);
        const lng = getSafeCoord(item.longitude ?? item.lng);
        if (lat === null || lng === null) return null;

        const engineStatus = parseInt(String(item.IP1), 10) || 0;
        const speed = parseFloat(String(item.speed)) || 0;
        const t1 = getSafeCoord(item.temp1);
        const t2 = getSafeCoord(item.temp2);

        return {
          id: item.vehicleid,
          lat,
          lng,
          label: item.alias || item.vehicleid,
          engine: engineStatus,
          speed: speed,
          temp1: t1,
          temp2: t2,
        };
      })
      .filter((marker): marker is MapMarker => Boolean(marker));
  };

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body { margin:0; padding:0; overflow:hidden; }
  #map { width:100vw; height:100vh; }
  .leaflet-control-attribution { display:none!important; }
  .marker-container { display: flex; justify-content: center; align-items: center; width: 32px; height: 32px; }
  .marker-dot {
  width: 14px;
  height: 14px;
  background-color: #EF4444;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0,0,0,0.5);
}
  .layer-container { position:absolute; bottom:90px; right:15px; z-index:9999; }
  .layer-fab { width:50px; height:50px; border:none; border-radius:50%; background:white; font-size:22px; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
  .layer-menu { display:none; flex-direction:column; gap:8px; position:absolute; bottom:65px; right:0; background:white; border-radius:16px; padding:10px; box-shadow: 0 6px 18px rgba(0,0,0,.15); min-width:130px; }
  .layer-menu.show { display:flex; }
  .layer-option { display:flex; align-items:center; gap:10px; padding:4px; }
  .layer-option img { width:38px; height:38px; border-radius:10px; border: 1px solid #eee; object-fit:cover; }
  .layer-option span { font-size:12px; font-weight:600; color:#333; }
</style>
</head>
<body>
<div id="map"></div>
<div class="layer-container">
    <div id="layerMenu" class="layer-menu">
        <div class="layer-option" onclick="setLayer('street'); toggleLayerMenu();"><img src="https://tile.openstreetmap.org/6/53/34.png"/><span>Default</span></div>
        <div class="layer-option" onclick="setLayer('satellite'); toggleLayerMenu();"><img src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/53/34"/><span>Satellite</span></div>
    </div>
    <button class="layer-fab" onclick="toggleLayerMenu()">🗺️</button>
</div>
<script>
var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
var map = L.map('map', { zoomControl:false, attributionControl:false, preferCanvas:true, layers:[street] }).setView([-2.5,118],5);
var current="street";

function toggleLayerMenu(){ document.getElementById('layerMenu').classList.toggle('show'); }
function setLayer(type){
  if(current===type) return;
  map.removeLayer(street); map.removeLayer(satellite);
  if(type==="street") map.addLayer(street);
  if(type==="satellite") map.addLayer(satellite);
  current=type;
}

var markersLayer = L.layerGroup().addTo(map);

function getArrowSvg(color) {
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 20H12H20L12 2Z" fill="' + color + '" stroke="white" stroke-width="1"/></svg>';
}

window.updateMarkers = function(data){
  markersLayer.clearLayers();
  data.forEach(function(v){
    if(!v.lat || !v.lng) return;
    
    var htmlContent = '';
    var isMoving = v.speed > 0 && v.engine === 1;
    
    if (!isMoving) {
   htmlContent = '<div class="marker-container"><div class="marker-dot"></div></div>';
} else {
   var t1 = v.temp1;
   var t2 = v.temp2;
   var color = '#16A34A';
   var hasTemp = (t1 !== null && t1 !== undefined) || (t2 !== null && t2 !== undefined);
   
   if (hasTemp) {
       var val1 = (t1 !== null && t1 !== undefined) ? t1 : 999; 
       var val2 = (t2 !== null && t2 !== undefined) ? t2 : 999;
       var minTemp = Math.min(val1, val2);
       
       if (minTemp < -15) color = '#1E3A8A';
       else if (minTemp >= -15 && minTemp <= 0) color = '#3B82F6';
       else if (minTemp > 0 && minTemp <= 15) color = '#16A34A';
       else color = '#16A34A';
   }
   htmlContent = '<div class="marker-container">' + getArrowSvg(color) + '</div>';
}

    var myIcon = L.divIcon({ className: 'my-custom-icon', html: htmlContent, iconSize: [32, 32], iconAnchor: [16, 16] });
    L.marker([v.lat, v.lng], { icon: myIcon }).addTo(markersLayer).on('click', function(){
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VEHICLE', id: v.id }));
    });
  });
};
window.panTo = function(lat, lng){ if(lat && lng){ map.setView([lat, lng], 16, { animate:true }); } };
</script>
</body>
</html>
`;

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === "SELECT_VEHICLE") {
        const vehicle = filteredData.find((v) => v.vehicleid === payload.id);
        if (vehicle) handleSelectVehicle(vehicle);
      }
    } catch (e) {
      console.error("WebView message error", e);
    }
  };

  useEffect(() => {
    if (
      isMapReady &&
      webViewRef.current &&
      filteredData.length > 0 &&
      activeMenu === "dashboard"
    ) {
      const markers = getMapMarkers();
      const jsCode = `if(typeof updateMarkers === 'function') { updateMarkers(${JSON.stringify(markers)}); } true;`;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [isMapReady, filteredData, activeMenu]);

  const handleSelectVehicle = (item: Vehicle) => {
    Keyboard.dismiss();
    setSelectedVehicleId(item.vehicleid);
    const lat = getSafeCoord(item.latitude ?? item.lat);
    const lng = getSafeCoord(item.longitude ?? item.lng);
    if (lat !== null && lng !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`panTo(${lat}, ${lng}); true;`);
    }
  };

  const selectedVehicle = filteredData.find(
    (v) => v.vehicleid === selectedVehicleId,
  );

  const getEngineStatus = (ip1: any) => {
    const val = parseInt(String(ip1), 10);
    if (val === 1) return { text: "ON", color: "#16A34A" };
    return { text: "OFF", color: "#DC2626" };
  };

  const getDoorStatus = (door: any) => {
    if (door === null || door === undefined || door === "")
      return { text: "-", color: "#6B7280" };
    const value = String(door).trim();
    if (value.includes("1")) return { text: "OPEN", color: "#DC2626" };
    if (/^0+$/.test(value)) return { text: "CLOSED", color: "#16A34A" };
    return { text: "-", color: "#6B7280" };
  };

  const c = (val: any) => val || "-";

  const renderContent = () => {
    if (activeMenu !== "dashboard") {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>
            {activeMenu === "history" ? "📜" : "⚙️"}
          </Text>
          <Text style={[styles.placeholderText, styles.textDark]}>
            {activeMenu === "history"
              ? "Halaman Riwayat"
              : "Halaman Pengaturan"}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.dashboardContainer,
          { flexDirection: isLandscape ? "row" : "column" },
        ]}
      >
        <View
          style={[
            styles.mapWrapper,
            isTableVisible ? styles.mapWrapperSmall : styles.mapWrapperFull,
          ]}
        >
          <WebView
            ref={webViewRef}
            source={{ html: leafletHtml }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadEnd={() => setIsMapReady(true)}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator color="#2563EB" size="large" />
                <Text style={{ marginTop: 10, color: "#2563EB" }}>
                  Memuat Peta...
                </Text>
              </View>
            )}
          />

          <View style={styles.floatingButtonsContainer}>
            <TouchableOpacity
              style={styles.floatingMenuBtn}
              onPress={() => setIsSidebarOpen(true)}
            >
              <Text style={styles.floatingMenuIcon}>☰</Text>
            </TouchableOpacity>

            {/* UBAH: Menggunakan Feather Icon */}
            <TouchableOpacity
              style={[
                styles.floatingMenuBtn,
                { marginTop: 10 },
                (selectedEngines.length > 0 || selectedTemps.length > 0) &&
                  styles.filterActiveBtn,
              ]}
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Feather
                name="filter"
                size={24}
                color={
                  selectedEngines.length > 0 || selectedTemps.length > 0
                    ? "white"
                    : "#111827"
                }
              />
            </TouchableOpacity>
          </View>

          {selectedVehicle && (
            <View style={styles.bottomPopupContainer}>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <View>
                      <Text style={styles.dropdownText}>
                        {selectedVehicle.alias || selectedVehicle.vehicleid}
                      </Text>
                      <Text
                        style={[
                          styles.engineBadge,
                          { color: getEngineStatus(selectedVehicle.IP1).color },
                        ]}
                      >
                        {getEngineStatus(selectedVehicle.IP1).text}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16 }}>
                      {showVehicleDropdown ? "▲" : "▼"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showVehicleDropdown && (
                  <FlatList
                    data={filteredData}
                    keyExtractor={(item) => item.vehicleid}
                    style={styles.dropdownList}
                    nestedScrollEnabled
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          selectedVehicleId === item.vehicleid && {
                            backgroundColor: "#EFF6FF",
                          },
                        ]}
                        onPress={() => {
                          handleSelectVehicle(item);
                          setShowVehicleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemTitle}>
                          {item.alias || item.vehicleid}
                        </Text>
                        <Text style={styles.dropdownItemSub}>
                          {item.vehicleid}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>

              <ScrollView
                style={styles.popupScroll}
                contentContainerStyle={styles.popupContent}
              >
                <View style={styles.popupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popupTitle} numberOfLines={1}>
                      {selectedVehicle.alias || "No Name"}
                    </Text>
                    <Text style={styles.popupSub}>
                      {selectedVehicle.vehicleid}
                    </Text>
                  </View>
                </View>

                <View style={styles.popupDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Engine</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color: getEngineStatus(selectedVehicle.IP1).color,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {getEngineStatus(selectedVehicle.IP1).text}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Temp 1</Text>
                    <Text style={styles.detailValue}>
                      {getSafeCoord(selectedVehicle.temp1) !== null
                        ? `${getSafeCoord(selectedVehicle.temp1)?.toFixed(1)} °C`
                        : "-"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Temp 2</Text>
                    <Text style={styles.detailValue}>
                      {getSafeCoord(selectedVehicle.temp2) !== null
                        ? `${getSafeCoord(selectedVehicle.temp2)?.toFixed(1)} °C`
                        : "-"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Door</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: getDoorStatus(selectedVehicle.door).color },
                      ]}
                    >
                      {getDoorStatus(selectedVehicle.door).text}
                    </Text>
                  </View>
                  <View style={styles.separatorLine} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Street Name</Text>
                    <Text style={styles.detailValue}>
                      {c(selectedVehicle.stn)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>City</Text>
                    <Text style={styles.detailValue}>
                      {c(selectedVehicle.City)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Province</Text>
                    <Text style={styles.detailValue}>
                      {c(selectedVehicle.Province)}
                    </Text>
                  </View>
                  <View style={styles.separatorLine} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Speed</Text>
                    <Text style={styles.detailValue}>
                      {selectedVehicle.speed || 0} km/h
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {isTableVisible && (
          <View
            style={
              isLandscape
                ? styles.tableWrapperLandscape
                : styles.tableWrapperPortrait
            }
          >
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.vehicleid}
              renderItem={renderTableItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2563EB"
                />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Tidak ada data (Filter Aktif)
                </Text>
              }
              contentContainerStyle={styles.tableListContent}
            />
          </View>
        )}
      </View>
    );
  };

  const renderTableItem: ListRenderItem<Vehicle> = ({ item }) => {
    const isSelected = selectedVehicleId === item.vehicleid;
    return (
      <TouchableOpacity
        style={[styles.tableRow, isSelected && styles.tableRowSelected]}
        onPress={() => handleSelectVehicle(item)}
      >
        <View style={styles.tableCellMain}>
          <Text
            style={[styles.tableCellTitle, styles.textDark]}
            numberOfLines={1}
          >
            {item.alias || item.vehicleid}
          </Text>
          <Text style={styles.tableCellSub}>{item.vehicleid}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderContent()}

      <Sidebar
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeMenu={activeMenu}
        onMenuSelect={(id: string) => setActiveMenu(id)}
        onLogout={handleLogout}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setIsFilterModalVisible(false)}
        >
          <View
            style={styles.filterModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Vehicle</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Feather name="x-circle" size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.filterSectionTitle}>Status Engine</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedEngines.length === 0 && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedEngines([])}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedEngines.length === 0 &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    Semua
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedEngines.includes("on") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedEngines, "on", setSelectedEngines)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedEngines.includes("on") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    Engine ON
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedEngines.includes("off") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedEngines, "off", setSelectedEngines)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedEngines.includes("off") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    Engine OFF
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>
                Range Suhu
              </Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedTemps.length === 0 && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedTemps([])}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTemps.length === 0 && styles.filterChipTextActive,
                    ]}
                  >
                    Semua
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedTemps.includes("frozen") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedTemps, "frozen", setSelectedTemps)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTemps.includes("frozen") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    &gt; -15°C
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedTemps.includes("cold") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedTemps, "cold", setSelectedTemps)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTemps.includes("cold") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                      0°C s/d -15°C
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.filterOptionsRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedTemps.includes("cool") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedTemps, "cool", setSelectedTemps)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTemps.includes("cool") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    0°C s/d 15°C
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedTemps.includes("warm") && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    toggleFilter(selectedTemps, "warm", setSelectedTemps)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTemps.includes("warm") &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    &gt; 15°C
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedEngines([]);
                setSelectedTemps([]);
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  textDark: { color: "#111827" },
  dashboardContainer: { flex: 1 },
  mapWrapper: { backgroundColor: "#E5E7EB", overflow: "hidden" },
  mapWrapperFull: { flex: 1 },
  mapWrapperSmall: { flex: 0.7 },
  map: { width: "100%", height: "100%" },
  mapLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  floatingButtonsContainer: {
    position: "absolute",
    top: 50,
    left: 15,
    zIndex: 10,
    alignItems: "center",
  },
  floatingMenuBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterActiveBtn: {
    backgroundColor: "#2563EB",
  },
  floatingMenuIcon: { color: "#111827", fontSize: 24, fontWeight: "bold" },

  bottomPopupContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "55%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  dropdownContainer: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownButton: { padding: 14, flexDirection: "row", alignItems: "center" },
  dropdownText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  engineBadge: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  dropdownList: { maxHeight: 150, borderTopWidth: 1, borderColor: "#eee" },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  dropdownItemSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  popupScroll: { paddingHorizontal: 15 },
  popupContent: { paddingVertical: 15 },
  popupHeader: { marginBottom: 10 },
  popupTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  popupSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  popupDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 2,
    textAlign: "right",
  },
  separatorLine: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },

  tableWrapperLandscape: {
    flex: 0.3,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
  },
  tableWrapperPortrait: {
    height: "30%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tableListContent: { paddingVertical: 5, paddingBottom: 20 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    justifyContent: "space-between",
    marginHorizontal: 5,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: "#FFFFFF",
  },
  tableRowSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tableCellMain: { flex: 1, marginRight: 5 },
  tableCellTitle: { fontSize: 13, fontWeight: "600" },
  tableCellSub: { color: "#6B7280", fontSize: 11, marginTop: 1 },

  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  placeholderIcon: { fontSize: 60, marginBottom: 20 },
  placeholderText: { fontSize: 20, fontWeight: "bold" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },

  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  filterOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  filterChipText: { color: "#374151", fontSize: 13, fontWeight: "500" },
  filterChipTextActive: { color: "white" },

  resetButton: {
    marginTop: 20,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  resetButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
});

export default HomeScreen;
