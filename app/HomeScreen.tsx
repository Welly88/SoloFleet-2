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
  TextInput,
} from "react-native";
import { WebView } from "react-native-webview";
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
        if (minTemp <= -15) category = "frozen";
        else if (minTemp >= -14 && minTemp <= -1) category = "cold";
        else if (minTemp >= 0 && minTemp <= 10) category = "cool";
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
        return {
          id: item.vehicleid,
          lat,
          lng,
          label: item.alias || item.vehicleid,
          engine: parseInt(String(item.IP1), 10) || 0,
          speed: parseFloat(String(item.speed)) || 0,
          temp1: getSafeCoord(item.temp1),
          temp2: getSafeCoord(item.temp2),
        };
      })
      .filter((marker): marker is MapMarker => Boolean(marker));
  };

  // === HTML PETA: BADAN = SUHU, HIGHLIGHT PULSE = ENGINE/JALAN ===
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
  .leaflet-control-zoom { display:none!important; }
  .marker-wrapper { display:flex; justify-content:center; align-items:center; width:32px; height:32px; position:relative; }
  .marker-pulse { position:absolute; width:32px; height:32px; border-radius:50%; animation:pulse 2.5s ease-out infinite; }
  
  /* Warna Highlight Pulse berdasarkan Status */
  .marker-pulse.moving { background:rgba(34,197,94,0.4); } /* Hijau: Sedang Jalan */
  .marker-pulse.idle { background:rgba(245,158,11,0.3); }   /* Kuning: Engine ON tapi diam */
  .marker-pulse.off { background:rgba(239,68,68,0.3); }     /* Merah: Engine OFF */
  
  @keyframes pulse { 0%{transform:scale(1);opacity:0.7;} 100%{transform:scale(2.5);opacity:0;} }
  
  .layer-container { position:absolute; bottom:20px; right:15px; z-index:9999; }
  .layer-fab { width:42px; height:42px; border:none; border-radius:14px; background:rgba(255,255,255,0.97); font-size:18px; box-shadow:0 2px 12px rgba(0,0,0,.15); display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .layer-menu { display:none; flex-direction:column; gap:6px; position:absolute; bottom:52px; right:0; background:rgba(255,255,255,0.98); border-radius:14px; padding:10px; box-shadow:0 4px 24px rgba(0,0,0,.12); min-width:150px; backdrop-filter:blur(10px); }
  .layer-menu.show { display:flex; }
  .layer-option { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer; transition:background 0.2s; }
  .layer-option:active { background:rgba(0,0,0,0.05); }
  .layer-option.active { background:rgba(37,99,235,0.08); }
  .layer-option img { width:36px; height:36px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); object-fit:cover; }
  .layer-option span { font-size:12px; font-weight:600; color:#374151; }
  .layer-option.active span { color:#2563EB; }
</style>
</head>
<body>
<div id="map"></div>
<div class="layer-container">
  <div id="layerMenu" class="layer-menu">
    <div class="layer-option active" id="opt-standard" onclick="setLayer('standard');toggleLayerMenu();">
      <img src="https://tile.openstreetmap.org/6/53/34.png"/><span>Standard</span>
    </div>
    <div class="layer-option" id="opt-voyager" onclick="setLayer('voyager');toggleLayerMenu();">
      <img src="https://basemaps.cartocdn.com/rastertiles/voyager/6/53/34.png"/><span>Voyager</span>
    </div>
    <div class="layer-option" id="opt-satellite" onclick="setLayer('satellite');toggleLayerMenu();">
      <img src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/53/34"/><span>Satellite</span>
    </div>
  </div>
  <button class="layer-fab" onclick="toggleLayerMenu()">🗺️</button>
</div>
<script>
var standardLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19});
var voyagerLayer=L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19});
var satelliteLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:18});
var map=L.map('map',{zoomControl:false,attributionControl:false,preferCanvas:true,layers:[standardLayer]}).setView([-2.5,118],5);
var current="standard";
var allLayers={standard:standardLayer,voyager:voyagerLayer,satellite:satelliteLayer};
function toggleLayerMenu(){document.getElementById('layerMenu').classList.toggle('show');}
function setLayer(type){if(current===type)return;map.removeLayer(allLayers[current]);map.addLayer(allLayers[type]);current=type;document.querySelectorAll('.layer-option').forEach(function(el){el.classList.remove('active');});var optEl=document.getElementById('opt-'+type);if(optEl)optEl.classList.add('active');}
var markersLayer=L.layerGroup().addTo(map);

// === ICON SEGITIGA (Warna diambil dari parameter SUHU) ===
function getTriangleSvg(color) {
  var shadow = '<polygon points="16,3 28,27 16,22 4,27" fill="rgba(0,0,0,0.2)" transform="translate(1, 1)"/>';
  var main = '<polygon points="16,2 28,26 16,21 4,26" fill="' + color + '" stroke="white" stroke-width="2" stroke-linejoin="round"/>';
  var shine = '<polygon points="16,6 22,22 16,19 10,22" fill="rgba(255,255,255,0.15)"/>';
  return '<svg width="32" height="30" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">' + shadow + main + shine + '</svg>';
}

// === ICON BULAT (Warna diambil dari parameter SUHU) ===
function getDotSvg(color) {
  var shadow = '<circle cx="16.8" cy="16.8" r="7" fill="rgba(0,0,0,0.15)"/>';
  var main = '<circle cx="16" cy="16" r="7" fill="' + color + '" stroke="white" stroke-width="2"/>';
  var inner = '<circle cx="16" cy="16" r="3" fill="rgba(255,255,255,0.25)"/>';
  return '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' + shadow + main + inner + '</svg>';
}

window.updateMarkers=function(data){
  markersLayer.clearLayers();
  data.forEach(function(v){
    if(!v.lat||!v.lng)return;
    
    var isEngineOn = v.engine === 1;
    var isMoving = v.speed > 0 && isEngineOn;
    
    // 1. HITUNG WARNA SUHU (INI JADI WARNA BADAN MARKER)
    var t1 = v.temp1;
    var t2 = v.temp2;
    var hasTemp = (t1 !== null && t1 !== undefined) || (t2 !== null && t2 !== undefined);
    var tempColor = '#9CA3AF'; // Default Abu jika tidak ada data suhu
    
    if (hasTemp) {
      var minTemp = Math.min(
        (t1 !== null && t1 !== undefined) ? t1 : 999,
        (t2 !== null && t2 !== undefined) ? t2 : 999
      );
      
      if (minTemp <= -15) {
        tempColor = '#1E3A8A'; // Biru Tua (-30 s/d -15)
      } else if (minTemp >= -14 && minTemp <= -1) {
        tempColor = '#60A5FA'; // Biru Muda (-14 s/d -1)
      } else if (minTemp >= 0 && minTemp <= 10) {
        tempColor = '#15803D'; // Hijau Tua (0 s/d 10)
      } else {
        tempColor = '#F59E0B'; // Orange (> 10)
      }
    }

    // 2. TENTUKAN HIGHLIGHT PULSE (INI UNTUK MENANDAI SEDANG JALAN / ENGINE)
    var pulseHtml = '';
    if (isMoving) {
      pulseHtml = '<div class="marker-pulse moving"></div>'; // Highlight Hijau: Sedang Jalan
    } else if (isEngineOn) {
      pulseHtml = '<div class="marker-pulse idle"></div>'; // Highlight Kuning: Engine ON tapi diam
    } else {
      pulseHtml = '<div class="marker-pulse off"></div>'; // Highlight Merah: Engine OFF
    }

    // 3. GAMBAR MARKER (Bentuk segitiga/bulat dipakai warna Suhu)
    var svgHtml = isMoving ? getTriangleSvg(tempColor) : getDotSvg(tempColor);
    var htmlContent = '<div class="marker-wrapper">' + pulseHtml + svgHtml + '</div>';
    
    var myIcon = L.divIcon({
      className: 'my-custom-icon',
      html: htmlContent,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([v.lat, v.lng], { icon: myIcon })
      .addTo(markersLayer)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VEHICLE', id: v.id }));
      });
  });
};

window.panTo=function(lat,lng){if(lat&&lng){map.setView([lat,lng],16,{animate:true});}};
</script>
</body>
</html>`;

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
    setShowVehicleDropdown(false);
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
    if (val === 1) return { text: "ON", color: "#22C55E" };
    return { text: "OFF", color: "#EF4444" };
  };

  const getDoorStatus = (door: any) => {
    if (door === null || door === undefined || door === "")
      return { text: "-", color: "#6B7280" };
    const value = String(door).trim();
    if (value.includes("1")) return { text: "OPEN", color: "#EF4444" };
    if (/^0+$/.test(value)) return { text: "CLOSED", color: "#22C55E" };
    return { text: "-", color: "#6B7280" };
  };

  const c = (val: any) => val || "-";

  const renderNavbar = () => (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.burgerBtn}
        onPress={() => setIsSidebarOpen(true)}
      >
        <Feather name="menu" size={18} color="#374151" />
      </TouchableOpacity>
      <View style={styles.vehicleSelectorContainer}>
        <TouchableOpacity
          style={styles.vehicleSelectorBtn}
          onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
        >
          <Feather name="truck" size={14} color="#9CA3AF" />
          <Text style={styles.vehicleSelectorText} numberOfLines={1}>
            {selectedVehicle
              ? selectedVehicle.alias || selectedVehicle.vehicleid
              : "Pilih Kendaraan"}
          </Text>
          <Feather
            name={showVehicleDropdown ? "chevron-up" : "chevron-down"}
            size={14}
            color="#D1D5DB"
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[
          styles.filterBtn,
          (selectedEngines.length > 0 || selectedTemps.length > 0) &&
            styles.filterBtnActive,
        ]}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <Feather
          name="sliders"
          size={16}
          color={
            selectedEngines.length > 0 || selectedTemps.length > 0
              ? "white"
              : "#9CA3AF"
          }
        />
      </TouchableOpacity>
    </View>
  );

  const renderVehicleDropdown = () => {
    if (!showVehicleDropdown) return null;
    return (
      <View style={styles.vehicleDropdown}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={14} color="#D1D5DB" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kendaraan..."
            placeholderTextColor="#D1D5DB"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Feather name="x" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.vehicleid}
          style={styles.dropdownList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selectedVehicleId === item.vehicleid;
            const engineStatus = getEngineStatus(item.IP1);
            return (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  isSelected && styles.dropdownItemSelected,
                ]}
                onPress={() => handleSelectVehicle(item)}
              >
                <View
                  style={[
                    styles.engineDot,
                    { backgroundColor: engineStatus.color },
                  ]}
                />
                <View style={styles.dropdownItemContent}>
                  <Text
                    style={[
                      styles.dropdownItemTitle,
                      isSelected && styles.dropdownItemTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.alias || item.vehicleid}
                  </Text>
                  <Text style={styles.dropdownItemSub} numberOfLines={1}>
                    {item.vehicleid}
                  </Text>
                </View>
                {isSelected && (
                  <Feather name="check" size={14} color="#2563EB" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyDropdown}>
              <Feather name="x-circle" size={28} color="#E5E7EB" />
              <Text style={styles.emptyDropdownText}>
                Kendaraan tidak ditemukan
              </Text>
            </View>
          }
        />
      </View>
    );
  };

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
      <View style={styles.dashboardContainer}>
        {renderNavbar()}
        {renderVehicleDropdown()}
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
                <Text style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12 }}>
                  Memuat Peta...
                </Text>
              </View>
            )}
          />
          {selectedVehicle && (
            <>
              <TouchableOpacity
                style={styles.popupDismissArea}
                activeOpacity={1}
                onPress={() => setSelectedVehicleId(null)}
              />
              <View style={styles.bottomPopupContainer}>
                <View style={styles.popupHandle}>
                  <View style={styles.popupHandleBar} />
                </View>
                <ScrollView
                  style={styles.popupScroll}
                  contentContainerStyle={styles.popupContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.popupHeader}>
                    <View style={styles.popupTitleContainer}>
                      <View
                        style={[
                          styles.popupEngineIndicator,
                          {
                            backgroundColor: getEngineStatus(
                              selectedVehicle.IP1,
                            ).color,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.popupTitle} numberOfLines={1}>
                          {selectedVehicle.alias || "No Name"}
                        </Text>
                        <Text style={styles.popupSub}>
                          {selectedVehicle.vehicleid}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.popupDetails}>
                    <View style={styles.detailGrid2x2}>
                      <View
                        style={[styles.detailCard, styles.detailCardTopLeft]}
                      >
                        <Feather name="cpu" size={16} color="#9CA3AF" />
                        <Text style={styles.detailLabel}>Engine</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              color: getEngineStatus(selectedVehicle.IP1).color,
                            },
                          ]}
                        >
                          {getEngineStatus(selectedVehicle.IP1).text}
                        </Text>
                      </View>
                      <View
                        style={[styles.detailCard, styles.detailCardTopRight]}
                      >
                        <Feather
                          name={
                            getDoorStatus(selectedVehicle.door).text === "OPEN"
                              ? "alert-circle"
                              : "check-circle"
                          }
                          size={16}
                          color="#9CA3AF"
                        />
                        <Text style={styles.detailLabel}>Door</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              color: getDoorStatus(selectedVehicle.door).color,
                            },
                          ]}
                        >
                          {getDoorStatus(selectedVehicle.door).text}
                        </Text>
                      </View>
                      <View
                        style={[styles.detailCard, styles.detailCardBottomLeft]}
                      >
                        <Feather name="thermometer" size={16} color="#9CA3AF" />
                        <Text style={styles.detailLabel}>Temp 1</Text>
                        <Text style={styles.detailValue}>
                          {getSafeCoord(selectedVehicle.temp1) !== null
                            ? `${getSafeCoord(selectedVehicle.temp1)?.toFixed(1)}°`
                            : "-"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.detailCard,
                          styles.detailCardBottomRight,
                        ]}
                      >
                        <Feather name="thermometer" size={16} color="#9CA3AF" />
                        <Text style={styles.detailLabel}>Temp 2</Text>
                        <Text style={styles.detailValue}>
                          {getSafeCoord(selectedVehicle.temp2) !== null
                            ? `${getSafeCoord(selectedVehicle.temp2)?.toFixed(1)}°`
                            : "-"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.locationInfo}>
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={13} color="#D1D5DB" />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {c(selectedVehicle.stn) ||
                            c(selectedVehicle.dnm) ||
                            c(selectedVehicle.subd) ||
                            "-"}
                        </Text>
                      </View>
                      <View style={styles.locationRow}>
                        <Feather name="home" size={13} color="#D1D5DB" />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {c(selectedVehicle.City)}
                          {selectedVehicle.City && selectedVehicle.Province
                            ? ", "
                            : ""}
                          {c(selectedVehicle.Province)}
                        </Text>
                      </View>
                      <View style={styles.speedRow}>
                        <Feather name="activity" size={13} color="#D1D5DB" />
                        <Text style={styles.speedText}>
                          {selectedVehicle.speed || 0} km/h
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </>
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
    const engineStatus = getEngineStatus(item.IP1);
    return (
      <TouchableOpacity
        style={[styles.tableRow, isSelected && styles.tableRowSelected]}
        onPress={() => handleSelectVehicle(item)}
      >
        <View
          style={[
            styles.tableEngineDot,
            { backgroundColor: engineStatus.color },
          ]}
        />
        <View style={styles.tableCellMain}>
          <Text
            style={[styles.tableCellTitle, styles.textDark]}
            numberOfLines={1}
          >
            {item.alias || item.vehicleid}
          </Text>
          <Text style={styles.tableCellSub}>{item.vehicleid}</Text>
        </View>
        <Text style={styles.tableSpeed}>{item.speed || 0} km/h</Text>
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
              <Text style={styles.modalTitle}>Filter Kendaraan</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Feather name="x" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>Status Engine</Text>
              <View style={styles.filterOptionsRow}>
                {[
                  { key: "all", label: "Semua", value: [] },
                  { key: "on", label: "Engine ON", value: ["on"] },
                  { key: "off", label: "Engine OFF", value: ["off"] },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.filterChip,
                      (opt.key === "all"
                        ? selectedEngines.length === 0
                        : selectedEngines.includes(opt.key)) &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedEngines(opt.value as string[])}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        (opt.key === "all"
                          ? selectedEngines.length === 0
                          : selectedEngines.includes(opt.key)) &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                    {"< -15°C"}
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
                    -14°C ~ -1°C
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.filterOptionsRow, { marginTop: 8 }]}>
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
                    0°C ~ 10°C
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
                    {"> 10°C"}
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
              <Feather name="rotate-ccw" size={13} color="white" />
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
  dashboardContainer: { flex: 1, backgroundColor: "#F3F4F6" },
  navbar: {
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    zIndex: 20,
  },
  burgerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  vehicleSelectorContainer: { flex: 1, marginHorizontal: 8 },
  vehicleSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  vehicleSelectorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  filterBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  vehicleDropdown: {
    position: "absolute",
    top: 45,
    left: 10,
    right: 10,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 25,
    maxHeight: 340,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
    paddingVertical: 0,
    height: 18,
  },
  dropdownList: { maxHeight: 280 },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 8,
  },
  dropdownItemSelected: { backgroundColor: "#EFF6FF" },
  engineDot: { width: 7, height: 7, borderRadius: 4 },
  dropdownItemContent: { flex: 1 },
  dropdownItemTitle: { fontSize: 12, fontWeight: "500", color: "#374151" },
  dropdownItemTitleSelected: { color: "#2563EB", fontWeight: "600" },
  dropdownItemSub: { fontSize: 10, color: "#D1D5DB", marginTop: 1 },
  emptyDropdown: { padding: 24, alignItems: "center", gap: 6 },
  emptyDropdownText: { color: "#D1D5DB", fontSize: 12 },
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
    backgroundColor: "#FAFAFA",
  },
  popupDismissArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: "42%",
    zIndex: 14,
  },
  bottomPopupContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "42%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  popupHandle: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  popupHandleBar: {
    width: 36,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  popupScroll: { paddingHorizontal: 14 },
  popupContent: { paddingBottom: 16 },
  popupHeader: { marginBottom: 10 },
  popupTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  popupEngineIndicator: { width: 8, height: 8, borderRadius: 4 },
  popupTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  popupSub: { fontSize: 11, color: "#D1D5DB", marginTop: 1 },
  popupDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  detailGrid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailCard: {
    width: "50%",
    padding: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  detailCardTopLeft: {
    borderRightWidth: 0.5,
    borderRightColor: "#E5E7EB",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  detailCardTopRight: { borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  detailCardBottomLeft: { borderRightWidth: 0.5, borderRightColor: "#E5E7EB" },
  detailCardBottomRight: {},
  detailLabel: { fontSize: 10, color: "#D1D5DB", marginTop: 1 },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  locationInfo: {
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  locationText: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 16 },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  speedText: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  tableWrapperLandscape: {
    flex: 0.3,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
  },
  tableWrapperPortrait: {
    height: "30%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  tableListContent: { paddingVertical: 4, paddingBottom: 16 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    marginHorizontal: 6,
    borderRadius: 8,
    marginBottom: 3,
    backgroundColor: "#FFFFFF",
  },
  tableRowSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  tableEngineDot: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
  tableCellMain: { flex: 1 },
  tableCellTitle: { fontSize: 12, fontWeight: "600" },
  tableCellSub: { color: "#D1D5DB", fontSize: 10, marginTop: 1 },
  tableSpeed: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
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
    color: "#D1D5DB",
    textAlign: "center",
    marginTop: 16,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalContent: {
    width: "88%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    maxHeight: "72%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  filterChipText: { color: "#9CA3AF", fontSize: 11, fontWeight: "500" },
  filterChipTextActive: { color: "white" },
  resetButton: {
    marginTop: 16,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  resetButtonText: { color: "white", fontWeight: "600", fontSize: 12 },
});

export default HomeScreen;
