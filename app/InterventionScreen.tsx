import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Linking,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const INTERVENTION_URL =
  "https://internalwebapp.solofleet.com/api/Camera/interventions";

const getInterventions = async (params: {
  dateFrom: string;
  dateTo: string;
}) => {
  const { dateFrom, dateTo } = params;
  const url = `${INTERVENTION_URL}?page=1&pageSize=100&dateFrom=${dateFrom}&dateTo=${encodeURIComponent(dateTo)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.error("HTTP Error:", response.status);
      return { success: false, data: [] };
    }

    const text = await response.text();
    if (!text) return { success: true, data: [] };

    const json = JSON.parse(text);
    const rawData = Array.isArray(json) ? json : json.data || [];

    return { success: true, data: rawData };
  } catch (error) {
    console.error("Intervention API Error:", error);
    return { success: false, data: [] };
  }
};

const today = () => new Date().toISOString().split("T")[0];

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .leaflet-control-zoom {
  display: none !important;
}
    .custom-label {
      background: white; border-radius: 8px; padding: 6px 10px; font-size: 12px;
      font-weight: 600; color: #111827; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid #e2e8f0; white-space: nowrap; pointer-events: none;
    }
    .leaflet-marker-icon { background: transparent !important; border: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: false,attributionControl: false, dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true, boxZoom: true, keyboard: true, tap: false
    }).setView([-7.88, 112.70], 10);

    L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: ''
  }
).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    let selectedLabel = null;

    window.updateMap = function(data) {
      if (!data) return;
      markersLayer.clearLayers();
      if (selectedLabel) map.removeLayer(selectedLabel);

      if (data.markers) {
        data.markers.forEach(m => {
          // Default merah untuk intervention/violation
          const color = m.color || '#ef4444'; 

          const marker = L.circleMarker([m.lat, m.lng], {
            radius: 7, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.9
          }).addTo(markersLayer);

          marker.on('click', function() {
            if (selectedLabel) map.removeLayer(selectedLabel);
            selectedLabel = L.marker([m.lat, m.lng], {
              interactive: false,
              icon: L.divIcon({
                className: '',
                html: '<div class="custom-label">' + (m.label || 'Violation') + '</div>',
                iconSize: [140, 40], iconAnchor: [70, 50]
              })
            }).addTo(map);

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_click', id: m.id }));
          });
        });
        
        // Fit bounds jika ada marker
        if (data.markers.length > 0) {
           const bounds = L.latLngBounds(data.markers.map(m => [m.lat, m.lng]));
           map.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    };

    window.focusMarker = function(lat, lng) {
      map.setView([lat, lng], 17, { animate: true, duration: 1 });
    };

    setTimeout(() => { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_loaded' })); }, 500);
  </script>
</body>
</html>
`;

function LeafletMap({ markers, onMarkerClick, selectedLocation }) {
  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      const mapData = {
        markers: markers.map((m) => ({
          lat: m.latitude,
          lng: m.longitude,
          id: m.messageId,
          label: m.violationEn || "Violation",
          color: "#ef4444",
        })),
      };
      webViewRef.current.injectJavaScript(`
        window.updateMap(${JSON.stringify(mapData)});
        true;
      `);
    }
  }, [markers, isMapReady]);

  useEffect(() => {
    if (isMapReady && selectedLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.focusMarker(${selectedLocation.latitude}, ${selectedLocation.longitude});
        true;
      `);
    }
  }, [selectedLocation, isMapReady]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "map_loaded") setIsMapReady(true);
      if (data.type === "marker_click" && onMarkerClick) onMarkerClick(data.id);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: leafletHtml }}
      style={{ flex: 1, backgroundColor: "transparent" }}
      onMessage={onMessage}
      originWhitelist={["*"]}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      scrollEnabled={false}
    />
  );
}

// =======================
// UI Components
// =======================

const EmptyState = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.centerContainer}>
    <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
    <Text style={styles.emptyText}>{title}</Text>
    {subtitle && <Text style={styles.emptySubText}>{subtitle}</Text>}
  </View>
);

function InterventionList({ data, onRowClick }) {
  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.messageId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.listItem, { borderLeftColor: "#ef4444" }]}
            onPress={() => onRowClick(item)}
          >
            <View style={styles.listItemContent}>
              <Text style={styles.timeText}>
                {formatDateTime(item.datetime)}
              </Text>
              <Text style={styles.streetText} numberOfLines={1}>
                {item.violationEn || item.violationType || "Unknown Violation"}
              </Text>
              <Text style={styles.cityText}>
                {[item.streetName, item.city].filter(Boolean).join(", ") || "-"}
              </Text>
            </View>
            <View style={styles.speedContainer}>
              <Text style={[styles.speedText, { color: "#ef4444" }]}>
                {item.speed || 0}
              </Text>
              <Text style={styles.speedLabel}>km/h</Text>

              {/* Indikator Media */}
              {(item.media1 || item.media2) && (
                <View style={{ flexDirection: "row", marginTop: 4 }}>
                  {item.media1 && (
                    <Ionicons
                      name="videocam"
                      size={12}
                      color="#64748b"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  {item.media2 && (
                    <Ionicons name="image" size={12} color="#64748b" />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No Interventions"
            subtitle="No data found for selected date"
          />
        }
      />
    </View>
  );
}

// =======================
// Main Screen
// =======================

export default function InterventionPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: today(),
    startTime: "00:00",
    endDate: today(),
    endTime: "23:59",
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartPickerTime, setShowStartPickerTime] = useState(false);
  const [showEndPickerTime, setShowEndPickerTime] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load data saat pertama kali buka
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Format: YYYY-MM-DD dan YYYY-MM-DD HH:mm:ss
      const dateFrom = filters.startDate;
      const dateTo = `${filters.endDate} ${filters.endTime}:59`;

      const res = await getInterventions({ dateFrom, dateTo });

      if (res.success) {
        setData(res.data);
        // Auto select first item for map focus if available
        if (res.data.length > 0) {
          setSelectedLocation(res.data[0]);
        }
      } else {
        setData([]);
        Alert.alert("Info", "Failed to fetch intervention data.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMapMarkerClick = (messageId: number) => {
    const item = data.find((d) => d.messageId === messageId);
    if (item) {
      setSelectedItem(item);
      setSelectedLocation(item);
    }
  };

  // Date Picker Handlers
  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate)
      setFilters((f) => ({
        ...f,
        startDate: selectedDate.toISOString().split("T")[0],
      }));
  };
  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate)
      setFilters((f) => ({
        ...f,
        endDate: selectedDate.toISOString().split("T")[0],
      }));
  };
  const onStartTimeChange = (event, selectedDate) => {
    setShowStartPickerTime(false);
    if (selectedDate)
      setFilters((f) => ({
        ...f,
        startTime: selectedDate.toTimeString().slice(0, 5),
      }));
  };
  const onEndTimeChange = (event, selectedDate) => {
    setShowEndPickerTime(false);
    if (selectedDate)
      setFilters((f) => ({
        ...f,
        endTime: selectedDate.toTimeString().slice(0, 5),
      }));
  };

  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        {data.length > 0 ? (
          <LeafletMap
            markers={data}
            onMarkerClick={handleMapMarkerClick}
            selectedLocation={selectedLocation}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="map-outline" size={40} color="#475569" />
            <Text style={styles.emptySubText}>No location data</Text>
          </View>
        )}
      </View>

      {/* Filter Section */}
      <View style={styles.filterCard}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.dateText}>{filters.startDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setShowStartPickerTime(true)}
          >
            <Text style={styles.dateText}>{filters.startTime}</Text>
          </TouchableOpacity>

          <Text style={{ marginHorizontal: 5, color: "#64748b" }}>→</Text>

          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.dateText}>{filters.endDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setShowEndPickerTime(true)}
          >
            <Text style={styles.dateText}>{filters.endTime}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>SEARCH INTERVENTIONS</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* List Section */}
      <View style={styles.contentContainer}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingTop: 10,
            paddingBottom: 5,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.filterLabel}>INTERVENTION LIST</Text>
          <Text style={styles.ganttSub}>{data.length} Records</Text>
        </View>
        <InterventionList
          data={data}
          onRowClick={(item) => {
            setSelectedItem(item);
            setSelectedLocation(item);
          }}
        />
      </View>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={new Date(filters.startDate)}
          mode="date"
          display="default"
          onChange={onStartDateChange}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={new Date(filters.endDate)}
          mode="date"
          display="default"
          onChange={onEndDateChange}
        />
      )}
      {showStartPickerTime && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={onStartTimeChange}
          is24Hour={true}
        />
      )}
      {showEndPickerTime && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={onEndTimeChange}
          is24Hour={true}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        {selectedItem && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Intervention Detail</Text>
                <TouchableOpacity onPress={() => setSelectedItem(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Vehicle ID</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.vehicleId}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "#fef2f2",
                      padding: 6,
                      borderRadius: 6,
                      borderLeftWidth: 3,
                      borderLeftColor: "#ef4444",
                    }}
                  >
                    <Text
                      style={{
                        color: "#ef4444",
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {selectedItem.violationEn || selectedItem.violationType}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(selectedItem.datetime)}
                </Text>

                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {selectedItem.streetName || "-"}
                </Text>
                <Text style={styles.detailSub}>
                  {[
                    selectedItem.subDistrict,
                    selectedItem.city,
                    selectedItem.province,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>

                <View style={styles.detailRow}>
                  <View>
                    <Text style={styles.detailLabel}>Speed</Text>
                    <Text style={[styles.detailValue, { color: "#ef4444" }]}>
                      {selectedItem.speed} km/h
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Source</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.safetySource || "-"}
                    </Text>
                  </View>
                </View>

                {/* Media Buttons */}
                <View style={{ marginTop: 20, gap: 10 }}>
                  {selectedItem.media1 && (
                    <TouchableOpacity
                      style={[
                        styles.mediaLinkBtn,
                        { backgroundColor: "#ef4444" },
                      ]}
                      onPress={() => Linking.openURL(selectedItem.media1)}
                    >
                      <Ionicons name="play-circle" size={20} color="#fff" />
                      <Text style={styles.mediaLinkText}>
                        Play Video Evidence
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedItem.media2 && (
                    <TouchableOpacity
                      style={[
                        styles.mediaLinkBtn,
                        { backgroundColor: "#64748b" },
                      ]}
                      onPress={() => Linking.openURL(selectedItem.media2)}
                    >
                      <Ionicons name="image" size={20} color="#fff" />
                      <Text style={styles.mediaLinkText}>
                        View Photo Evidence
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// =======================
// Styles (Reuse from DailyReport)
// =======================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgb(255, 255, 255)" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  emptySubText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  mapContainer: { height: 250, backgroundColor: "#f8fafc" },
  filterCard: {
    backgroundColor: "#e2e8f0",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  filterLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    gap: 5,
  },
  timeBtn: {
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dateText: { color: "#334155", fontSize: 12, fontWeight: "600" },
  applyBtn: {
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  contentContainer: { flex: 1, backgroundColor: "#f8fafc" },
  tabContainer: { flex: 1 },
  listItem: {
    backgroundColor: "#ffffff",
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    borderLeftWidth: 4,
  },
  listItemContent: { flex: 1 },
  timeText: {
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  streetText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
    marginVertical: 2,
  },
  cityText: { color: "#64748b", fontSize: 11 },
  speedContainer: { alignItems: "flex-end", justifyContent: "center" },
  speedText: { fontSize: 18, fontWeight: "800" },
  speedLabel: { fontSize: 10, color: "#64748b" },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 20,
  },
  modalHeader: {
    backgroundColor: "#ef4444",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  detailLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 12,
    textTransform: "uppercase",
  },
  detailValue: { color: "#111827", fontSize: 16, fontWeight: "600" },
  detailSub: { color: "#94a3b8", fontSize: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  mediaLinkBtn: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  mediaLinkText: { color: "#fff", fontWeight: "700" },
  ganttSub: { color: "#64748b", fontSize: 11, fontWeight: "600" },
});
