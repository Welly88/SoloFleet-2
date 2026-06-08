import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Picker } from "@react-native-picker/picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getVehicleData } from "./api/auth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DAILY_REPORT_URL =
  "https://internalwebapp.solofleet.com/api/Camera/daily-report";

const getDailyReport = async (params) => {
  const { vehicleId, dateFrom, dateTo, interval } = params;
  let url = `${DAILY_REPORT_URL}?vehicleId=${vehicleId}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  if (interval && interval !== "all") {
    url += `&interval=${interval}`;
  }

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
    console.error("Report API Error:", error);
    return { success: false, data: [] };
  }
};

const today = () => new Date().toISOString().split("T")[0];

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Vehicle {
  id: string;
  vehicleid: string;
  label: string;
}
interface ReportItem {
  messageId: number;
  datetime: string;
  latitude: number;
  longitude: number;
  speed: number;
  streetName: string;
  city: string;
  violationType: string;
  media1: string;
  media2: string;
  distKm?: number;
}

const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }

    /* Sembunyikan seluruh control Leaflet */
    .leaflet-control-container {
      display: none !important;
    }

    .moving-arrow-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }

    .leaflet-popup-content-wrapper {
      border-radius: 8px;
    }

    .leaflet-popup-content {
      margin: 8px 12px;
      font-family: sans-serif;
    }

    .popup-jumping-title {
      color: #9333ea;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .popup-jumping-info {
      font-size: 12px;
      color: #333;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-polylinedecorator/1.6.0/leaflet.polylineDecorator.js"></script>

  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-7.88, 112.70], 10);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ).addTo(map);

    let markers = [];
    let routeLine = null;
    let flowLine = null;
    let arrowDecorator = null;
    let movingArrowMarker = null;
    let animInterval = null;
    let flowInterval = null;

    function getBearing(lat1, lon1, lat2, lon2) {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const y =
        Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);

      const x =
        Math.cos(lat1 * Math.PI / 180) *
        Math.sin(lat2 * Math.PI / 180) -
        Math.sin(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.cos(dLon);

      let brng = Math.atan2(y, x) * 180 / Math.PI;
      return (brng + 360) % 360;
    }

    window.updateMap = function(data) {
      if (!data) return;

      markers.forEach(m => map.removeLayer(m));
      markers = [];

      if (routeLine) map.removeLayer(routeLine);
      if (flowLine) map.removeLayer(flowLine);
      if (arrowDecorator) map.removeLayer(arrowDecorator);
      if (movingArrowMarker) map.removeLayer(movingArrowMarker);

      if (animInterval) clearInterval(animInterval);
      if (flowInterval) clearInterval(flowInterval);

      if (data.coords && data.coords.length > 0) {

        routeLine = L.polyline(data.coords, {
          color: '#6b7280',
          weight: 5,
          opacity: 0.8
        }).addTo(map);

        flowLine = L.polyline(data.coords, {
          color: '#ffffff',
          weight: 2,
          dashArray: '10,20',
          lineCap: 'butt'
        }).addTo(map);

        let offset = 0;

        flowInterval = setInterval(() => {
          flowLine.setStyle({
            dashOffset: -offset
          });

          offset -= 1;

          if (offset < -1000) {
            offset = 0;
          }
        }, 50);

        if (L.polylineDecorator) {
          arrowDecorator = L.polylineDecorator(routeLine, {
            patterns: [{
              offset: '10%',
              repeat: '100px',
              symbol: L.Symbol.arrowHead({
                pixelSize: 8,
                pathOptions: {
                  color: '#22c55e',
                  fillOpacity: 1,
                  weight: 0
                }
              })
            }]
          }).addTo(map);
        }

        map.fitBounds(routeLine.getBounds(), {
          padding: [20, 20]
        });
      }

      if (data.markers) {
        data.markers.forEach(item => {

          const marker = L.circleMarker(
            [item.lat, item.lng],
            {
              radius: 4,
              fillColor: '#a855f7',
              color: '#ffffff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            }
          )
          .addTo(map)
          .bindPopup(
            '<div class="popup-jumping-title">JUMPING:</div>' +
            '<div class="popup-jumping-info">Jump: ' +
            (item.distKm ? item.distKm.toFixed(1) : '0.0') +
            ' km</div>'
          )
          .on('click', function() {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'marker_click',
                id: item.id
              })
            );
          });

          marker.messageId = item.id;
          markers.push(marker);
        });
      }

      if (data.coords && data.coords.length > 0) {
        startArrowReplay(data.coords);
      }
    };

    function startArrowReplay(coords) {

      if (!coords || coords.length === 0) return;

      if (animInterval) {
        clearInterval(animInterval);
      }

      const arrowIcon = L.divIcon({
        className: 'moving-arrow-icon',
        html: \`
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#00ff33">
            <path
              d="M12 2 L4 20 L12 17 L20 20 Z"
              stroke="#b91c1c"
              stroke-width="1"
            />
          </svg>
        \`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      let initialAngle = 0;

      if (coords.length > 1) {
        initialAngle = getBearing(
          coords[0][0],
          coords[0][1],
          coords[1][0],
          coords[1][1]
        );
      }

      movingArrowMarker = L.marker(coords[0], {
        icon: arrowIcon,
        zIndexOffset: 3000
      }).addTo(map);

      function updateRotation(angle) {
        if (
          movingArrowMarker &&
          movingArrowMarker.getElement()
        ) {
          const svg =
            movingArrowMarker
              .getElement()
              .querySelector('svg');

          if (svg) {
            svg.style.transform =
              'rotate(' + angle + 'deg)';
          }
        }
      }

      updateRotation(initialAngle);

      let i = 0;
      const totalSteps = coords.length;
      const speed = 1200;

      animInterval = setInterval(() => {

        if (i >= totalSteps - 1) {
          i = 0;
          movingArrowMarker.setLatLng(coords[0]);
          return;
        }

        i++;

        const currentPoint = coords[i];
        const nextPoint =
          coords[i + 1] || coords[i];

        movingArrowMarker.setLatLng(currentPoint);

        if (coords[i + 1]) {
          const angle = getBearing(
            currentPoint[0],
            currentPoint[1],
            nextPoint[0],
            nextPoint[1]
          );

          updateRotation(angle);
        }

        // map.panTo(currentPoint, {
        //   animate: true,
        //   duration: 0.3
        // });

      }, speed);
    }

    window.focusMarker = function(lat, lng, id) {
      map.flyTo([lat, lng], 17, {
        animate: true
      });

      markers.forEach(m => {
        if (m.messageId === id) {
          m.openPopup();
        }
      });
    };

    setTimeout(() => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'map_loaded'
        })
      );
    }, 500);
  </script>
</body>
</html>
`;

function LeafletMap({ markers, polyline, onMarkerClick, selectedLocation }) {
  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (isMapReady && markers.length > 0 && webViewRef.current) {
      const mapData = {
        coords: polyline.map((item) => [item.latitude, item.longitude]),
        markers: markers.map((item) => ({
          lat: item.latitude,
          lng: item.longitude,
          id: item.messageId,
          isViolation: !!item.violationType,
          datetime: item.datetime,
          distKm: item.distKm || 0,
        })),
      };
      webViewRef.current.injectJavaScript(
        `window.updateMap(${JSON.stringify(mapData)}); true;`,
      );
    }
  }, [markers, polyline, isMapReady]);

  useEffect(() => {
    if (isMapReady && selectedLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.focusMarker(${selectedLocation.latitude}, ${selectedLocation.longitude}, ${selectedLocation.messageId});
        true;
      `);
    }
  }, [selectedLocation, isMapReady]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "map_loaded") setIsMapReady(true);
      if (data.type === "marker_click") onMarkerClick(data.id);
    } catch (err) {}
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: leafletHtml }}
      style={{ flex: 1, backgroundColor: "transparent" }}
      onMessage={onMessage}
      originWhitelist={["*"]}
      scrollEnabled={false}
    />
  );
}

const EmptyState = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.centerContainer}>
    <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
    <Text style={styles.emptyText}>{title}</Text>
    {subtitle && <Text style={styles.emptySubText}>{subtitle}</Text>}
  </View>
);

function VideoHistoryTab() {
  return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons
        name="video-off-outline"
        size={48}
        color="#64748b"
      />
      <Text style={styles.emptyText}>Video History</Text>
    </View>
  );
}

function GanttChartTab({ data }) {
  if (data.length === 0) return <EmptyState title="Gantt Chart" />;
  return (
    <ScrollView style={styles.tabContainer}>
      <View style={styles.ganttHeader}>
        <Text style={styles.filterLabel}>Route Timeline</Text>
        <Text style={styles.ganttSub}>{data.length} Report</Text>
      </View>
      <FlatList
        data={data}
        scrollEnabled={false}
        keyExtractor={(item) => item.messageId.toString()}
        renderItem={({ item }) => (
          <View style={styles.ganttRow}>
            <View style={{ width: 80 }}>
              <Text style={styles.timeText}>
                {new Date(item.datetime).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View
              style={[
                styles.ganttBar,
                { backgroundColor: item.violationType ? "#ef4444" : "#3b82f6" },
              ]}
            />
          </View>
        )}
      />
    </ScrollView>
  );
}

function MediaDirectoryTab({ data }) {
  const mediaItems = data.filter((r) => r.media1 || r.media2);
  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={mediaItems}
        numColumns={2}
        keyExtractor={(item) => item.messageId.toString()}
        renderItem={({ item }) => (
          <View style={styles.mediaCard}>
            <Image
              source={{ uri: item.media2 || item.media1 }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTime}>
                {formatDateTime(item.datetime)}
              </Text>
              <Text style={styles.mediaViolation}>
                {item.violationType || "Report"}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No Media" />}
      />
    </View>
  );
}

function ViolationDataTab({ violations, onRowClick }) {
  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={violations}
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
              <Text style={styles.streetText}>
                {item.streetName || item.city}
              </Text>
              <Text style={styles.violationBadge}>{item.violationType}</Text>
            </View>
            <View style={styles.speedContainer}>
              <Text style={[styles.speedText, { color: "#ef4444" }]}>
                {item.speed}
              </Text>
              <Text style={styles.speedLabel}>km/h</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState title="No Violations" />}
      />
    </View>
  );
}

function DailyDataTab({ data, onRowClick }) {
  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.messageId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.listItem,
              { borderLeftColor: item.violationType ? "#ef4444" : "#22c55e" },
            ]}
            onPress={() => onRowClick(item)}
          >
            <View style={styles.listItemContent}>
              <Text style={styles.timeText}>
                {formatDateTime(item.datetime)}
              </Text>
              <Text style={styles.streetText} numberOfLines={1}>
                {item.streetName || item.city || "-"}
              </Text>
              <Text style={styles.cityText}>{item.city}</Text>
            </View>
            <View style={styles.speedContainer}>
              <Text
                style={[
                  styles.speedText,
                  { color: item.speed > 60 ? "#ef4444" : "#22c55e" },
                ]}
              >
                {item.speed}
              </Text>
              <Text style={styles.speedLabel}>km/h</Text>
              <Text style={styles.distText}>
                {item.distKm?.toFixed(2) || "0.00"} km
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState title="No Data" />}
      />
    </View>
  );
}

export default function DailyReportPage() {
  const [activeTab, setActiveTab] = useState("daily");
  const [filters, setFilters] = useState({
    vehicleId: "",
    startDate: today(),
    startTime: "00:00",
    endDate: today(),
    endTime: "23:59",
    interval: "all",
  });

  const [rawData, setRawData] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartPickerTime, setShowStartPickerTime] = useState(false);
  const [showEndPickerTime, setShowEndPickerTime] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function loadVehicles() {
      setLoadingVehicles(true);
      const res = await getVehicleData();
      if (res.success && res.data) {
        const formatted = res.data.map((v) => ({
          id: v.vehicleid,
          vehicleid: v.vehicleid,
          label: v.alias || v.vehicleid,
        }));
        setVehicleOptions(formatted);
      } else {
        Alert.alert("Error", "Gagal memuat data kendaraan.");
      }
      setLoadingVehicles(false);
    }
    loadVehicles();
  }, []);

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    if (filters.interval === "all") {
      return rawData.map((row, i, arr) => {
        const dist =
          i === 0
            ? 0
            : haversine(
                arr[i - 1].latitude,
                arr[i - 1].longitude,
                row.latitude,
                row.longitude,
              );
        return { ...row, distKm: dist };
      });
    }

    const intervalMinutes = parseInt(filters.interval);
    const intervalMs = intervalMinutes * 60 * 1000;
    const result = [];
    let lastAddedTime = null;

    const sortedData = [...rawData].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );

    sortedData.forEach((item) => {
      const currentTime = new Date(item.datetime).getTime();
      if (
        !lastAddedTime ||
        item.violationType ||
        currentTime - lastAddedTime >= intervalMs
      ) {
        result.push(item);
        lastAddedTime = currentTime;
      }
    });

    return result.map((row, i, arr) => {
      const dist =
        i === 0
          ? 0
          : haversine(
              arr[i - 1].latitude,
              arr[i - 1].longitude,
              row.latitude,
              row.longitude,
            );
      return { ...row, distKm: dist };
    });
  }, [rawData, filters.interval]);

  const handleSearch = async () => {
    if (!filters.vehicleId) {
      Alert.alert("Error", "Please select a vehicle");
      return;
    }
    setLoading(true);
    try {
      const dateFrom = `${filters.startDate} ${filters.startTime}:00`;
      const dateTo = `${filters.endDate} ${filters.endTime}:59`;
      const params = {
        vehicleId: filters.vehicleId,
        dateFrom: dateFrom,
        dateTo: dateTo,
        interval: filters.interval,
      };
      const res = await getDailyReport(params);

      if (res.success) {
        const formatted = res.data.map((row) => ({
          messageId: row.messageId,
          datetime: row.datetime,
          latitude: row.latitude,
          longitude: row.longitude,
          speed: row.speed,
          streetName: row.streetName,
          city: row.city,
          violationEn: row.violationEn,
          violationType: row.violationEn || row.violationType,
          media1: row.media1,
          media2: row.media2,
        }));
        setRawData(formatted);
      } else {
        setRawData([]);
        Alert.alert("Info", "Tidak ada data ditemukan.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleMapMarkerClick = (messageId) => {
    const item = processedData.find((d) => d.messageId === messageId);
    if (item) setSelectedItem(item);
  };

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

  const violations = processedData.filter((r) => r.violationType);

  // Helper untuk membuka media
  const openMedia = (url) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {processedData.length > 0 ? (
          <LeafletMap
            markers={processedData}
            polyline={processedData}
            onMarkerClick={handleMapMarkerClick}
            selectedLocation={selectedItem}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="map-outline" size={40} color="#475569" />
            <Text style={styles.emptySubText}>Select filter to show map</Text>
          </View>
        )}
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>VEHICLE</Text>
            {loadingVehicles ? (
              <ActivityIndicator
                size="small"
                color="#3b82f6"
                style={{ marginVertical: 10 }}
              />
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.vehicleId}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, vehicleId: v }))
                  }
                  style={styles.picker}
                  dropdownIconColor="#475569"
                >
                  <Picker.Item
                    label="Select Vehicle..."
                    value=""
                    color="#94a3b8"
                  />
                  {vehicleOptions.map((v) => (
                    <Picker.Item
                      key={v.vehicleid}
                      label={v.label}
                      value={v.vehicleid}
                      color="#1e293b"
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>INTERVAL</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={filters.interval}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, interval: v }))
                }
                style={styles.picker}
                dropdownIconColor="#475569"
              >
                <Picker.Item label="Semua Data" value="all" color="#1e293b" />
                <Picker.Item label="2 Menit" value="2" color="#1e293b" />
                <Picker.Item label="5 Menit" value="5" color="#1e293b" />
                <Picker.Item label="10 Menit" value="10" color="#1e293b" />
              </Picker>
            </View>
          </View>
        </View>

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
          <Text style={{ marginHorizontal: 15, color: "#64748b" }}>→</Text>
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
            <Text style={styles.applyBtnText}>APPLY FILTERS</Text>
          )}
        </TouchableOpacity>

        {processedData.length > 0 && (
          <View style={styles.totalDataContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.totalDataText}>
              Total Data: {processedData.length} rows
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        {[
          { id: "daily", label: "Daily", icon: "list-outline" },
          {
            id: "violation",
            label: "Violation",
            icon: "warning-outline",
            count: violations.length,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? "#fff" : "#94a3b8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        {activeTab === "daily" && (
          <DailyDataTab data={processedData} onRowClick={setSelectedItem} />
        )}
        {activeTab === "violation" && (
          <ViolationDataTab
            violations={violations}
            onRowClick={setSelectedItem}
          />
        )}
      </View>

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

      <Modal visible={!!selectedItem} animationType="slide" transparent>
        {selectedItem && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedItem.violationType
                    ? "Violation Report"
                    : "Report Detail"}
                </Text>
                <TouchableOpacity onPress={() => setSelectedItem(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 16 }}>
                {(selectedItem.media2 || selectedItem.media1) && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      openMedia(selectedItem.media2 || selectedItem.media1)
                    }
                    style={styles.mediaTouchable}
                  >
                    <Image
                      source={{
                        uri: selectedItem.media2 || selectedItem.media1,
                      }}
                      // Jika violation, gambar lebih besar (style violationImage)
                      style={
                        selectedItem.violationType
                          ? styles.violationImage
                          : styles.detailImage
                      }
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlayIcon}>
                      <Ionicons name="expand-outline" size={32} color="white" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Tampilan Detail untuk Violation (Lebih Ringkas) */}
                {selectedItem.violationType ? (
                  <View style={styles.violationDetailsContainer}>
                    <View style={styles.violationBadgeLarge}>
                      <Text style={styles.violationBadgeLargeText}>
                        ⚠️ {selectedItem.violationType}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <View>
                        <Text style={styles.infoLabel}>Time</Text>
                        <Text style={styles.infoValue}>
                          {formatDateTime(selectedItem.datetime)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.infoLabel}>Speed</Text>
                        <Text
                          style={[
                            styles.infoValue,
                            { color: "#ef4444", fontWeight: "bold" },
                          ]}
                        >
                          {selectedItem.speed} km/h
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                      {selectedItem.streetName || selectedItem.city}
                    </Text>

                    {/* <TouchableOpacity 
                      style={styles.openMediaBtn} 
                      onPress={() => openMedia(selectedItem.media1 || selectedItem.media2)}
                    >
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={styles.openMediaText}>Open Media in Browser</Text>
                    </TouchableOpacity> */}
                  </View>
                ) : (
                  /* Tampilan Detail untuk Daily Data (Seperti biasa) */
                  <>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedItem.datetime)}
                    </Text>

                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.streetName || "-"}
                    </Text>
                    <Text style={styles.detailSub}>{selectedItem.city}</Text>

                    <View style={styles.detailRow}>
                      <View>
                        <Text style={styles.detailLabel}>Speed</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              color:
                                selectedItem.speed > 60 ? "#ef4444" : "#22c55e",
                            },
                          ]}
                        >
                          {selectedItem.speed} km/h
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.detailLabel}>Distance</Text>
                        <Text style={styles.detailValue}>
                          {selectedItem.distKm?.toFixed(2) || "0.00"} km
                        </Text>
                      </View>
                    </View>

                    {selectedItem.media1 ? (
                      <TouchableOpacity
                        style={styles.mediaLinkBtn}
                        onPress={() => Linking.openURL(selectedItem.media1)}
                      >
                        <Ionicons name="play-circle" size={20} color="#fff" />
                        <Text style={styles.mediaLinkText}>Play Video</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

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
  pickerWrapper: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
  },
  picker: { color: "#1e293b", height: 50, width: "100%" },
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
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  totalDataContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  totalDataText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 5,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  tabLabel: { color: "#64748b", fontSize: 10, marginTop: 2, fontWeight: "600" },
  tabLabelActive: { color: "#2563eb" },
  badge: {
    position: "absolute",
    top: 4,
    right: 10,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
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
  distText: { fontSize: 10, color: "#64748b", marginTop: 2 },
  violationBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#fca5a5",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    alignSelf: "flex-start",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 20,
  },
  modalHeader: {
    backgroundColor: "#3b82f6",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Styles for Media Click & View
  mediaTouchable: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },
  detailImage: {
    width: "100%",
    height: 180,
  },
  violationImage: {
    width: "100%",
    height: 250, // Larger image for violation
  },
  imageOverlayIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },

  // Styles for Violation Details View
  violationDetailsContainer: {
    paddingBottom: 10,
  },
  violationBadgeLarge: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
    alignItems: "center",
  },
  violationBadgeLargeText: {
    color: "#b91c1c",
    fontWeight: "bold",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  openMediaBtn: {
    marginTop: 15,
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  openMediaText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },

  // Standard Detail Styles (Daily)
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
    marginTop: 20,
    gap: 8,
  },
  mediaLinkText: { color: "#fff", fontWeight: "700" },

  // Unused styles kept for safety if tabs re-enabled
  mediaGrid: { padding: 5 },
  mediaCard: {
    flex: 1,
    margin: 5,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
    height: 150,
  },
  mediaImage: { width: "100%", height: 100 },
  mediaInfo: { padding: 8 },
  mediaTime: { color: "#64748b", fontSize: 10 },
  mediaViolation: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  ganttHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  ganttSub: { color: "#64748b", fontSize: 11 },
  ganttPlaceholder: { padding: 10 },
  ganttRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    height: 30,
  },
  ganttBar: { height: 10, width: "70%", borderRadius: 5 },
});
