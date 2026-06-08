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
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const INTERVENTION_URL =
  "https://internalwebapp.solofleet.com/api/Camera/interventions";

const GC = {
  dms: {
    bar: "rgba(212,83,126,0.65)",
    barA: "rgba(212,83,126,1)",
    badge: "#993556",
    bg: "rgba(212,83,126,0.1)",
    border: "rgba(212,83,126,0.35)",
    text: "#993556",
    label: "DMS",
  },
  adas: {
    bar: "rgba(186,117,23,0.65)",
    barA: "rgba(186,117,23,1)",
    badge: "#854f0b",
    bg: "rgba(186,117,23,0.1)",
    border: "rgba(186,117,23,0.35)",
    text: "#854f0b",
    label: "ADAS",
  },
  harsh: {
    bar: "rgba(127,119,221,0.65)",
    barA: "rgba(127,119,221,1)",
    badge: "#534ab7",
    bg: "rgba(127,119,221,0.1)",
    border: "rgba(127,119,221,0.35)",
    text: "#534ab7",
    label: "Harsh",
  },
};

const today = () => new Date().toISOString().split("T")[0];

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
    if (!response.ok) return { success: false, data: [] };
    const json = await response.json();
    return { success: true, data: json.data || [] };
  } catch (error) {
    return { success: false, data: [] };
  }
};

function groupData(data) {
  const r = { dms: {}, adas: {}, harsh: {} };
  data.forEach((d) => {
    const s = (d.safetySource || "").toLowerCase();
    if (!r[s]) return;
    const l = d.violationEn || d.violationType || "Unknown";
    r[s][l] = (r[s][l] || 0) + 1;
  });
  return r;
}

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

const chartHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    canvas { width: 100% !important; height: auto !important; }
  </style>
</head>
<body>
  <canvas id="chart"></canvas>
  <script>
    let myChart;
    function renderChart(config) {
      if (myChart) myChart.destroy();
      const ctx = document.getElementById('chart').getContext('2d');
      myChart = new Chart(ctx, config);
    }
  </script>
</body>
</html>
`;

function ChartCard({
  id,
  title,
  data,
  colorConfig,
  isActive,
  onPress,
  onBarClick,
}) {
  const webViewRef = useRef(null);
  const [height, setHeight] = useState(170);

  const entries = Object.entries(data || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  useEffect(() => {
    if (webViewRef.current && entries.length > 0) {
      const labels = entries.map(([l]) =>
        l.length > 12 ? l.slice(0, 11) + "…" : l,
      );
      const values = entries.map(([, v]) => v);
      const colors = entries.map((_, i) => colorConfig.bar);

      const config = {
        type: "bar",
        data: {
          labels,
          datasets: [
            { data: values, backgroundColor: colors, borderRadius: 4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#888", font: { size: 9 } },
            },
            y: {
              grid: { color: "rgba(128,128,128,0.15)" },
              ticks: { color: "#888", font: { size: 9 } },
            },
          },
          onClick: (e, els) => {
            if (els.length > 0) {
              const idx = els[0].index;
              // Kirim label asli (full) ke RN
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "bar_click", label: entries[idx][0] }),
              );
            }
          },
        },
      };

      webViewRef.current.injectJavaScript(
        `renderChart(${JSON.stringify(config)}); true;`,
      );
    }
  }, [data, colorConfig]);

  const total = Object.values(data || {}).reduce((a, b) => a + b, 0);

  return (
    <TouchableOpacity
      style={[styles.chartCard, isActive && { borderColor: colorConfig.badge }]}
      onPress={() => onPress(id)}
      activeOpacity={0.8}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSub}>{total} events</Text>
        </View>
        {isActive && (
          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor: colorConfig.bg,
                borderColor: colorConfig.border,
              },
            ]}
          >
            <Text style={[styles.activeBadgeText, { color: colorConfig.text }]}>
              Active
            </Text>
          </View>
        )}
      </View>
      <View style={{ height: 170 }}>
        {total === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={{ color: "#cbd5e1" }}>No data</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: chartHtml }}
            style={{ backgroundColor: "transparent" }}
            scrollEnabled={false}
            onMessage={(e) => {
              try {
                const d = JSON.parse(e.nativeEvent.data);
                if (d.type === "bar_click") onBarClick(d.label);
              } catch (err) {}
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// =======================
// UI Components
// =======================

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function DetailModal({ item, onClose }) {
  if (!item) return null;

  const s = (item.safetySource || "").toLowerCase();
  const c = GC[s] || { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b" };
  const spd = parseInt(item.speed) || 0;

  return (
    <Modal visible={!!item} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: c.text }]}>
            <Text style={styles.modalTitle}>
              {item.vehicleId} · {item.violationEn}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: c.bg, borderColor: c.border },
              ]}
            >
              <View style={[styles.sourceDot, { backgroundColor: c.badge }]} />
              <Text style={[styles.sourceText, { color: c.text }]}>
                {item.safetySource?.toUpperCase()}
              </Text>
            </View>

            {item.media1 && (
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => Linking.openURL(item.media1)}
              >
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.mediaBtnText}>Play Video</Text>
              </TouchableOpacity>
            )}

            {item.media2 && (
              <TouchableOpacity
                style={[styles.mediaBtn, { backgroundColor: "#475569" }]}
                onPress={() => Linking.openURL(item.media2)}
              >
                <Ionicons name="image" size={20} color="#fff" />
                <Text style={styles.mediaBtnText}>View Photo</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoCard}>
              <InfoRow label="Time" value={formatDateTime(item.datetime)} />
              <InfoRow label="Speed" value={`${spd} km/h`} />
              <InfoRow label="Location" value={item.streetName || item.city} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// =======================
// Main Screen
// =======================

export default function DmsAnalyticsPage() {
  const [filters, setFilters] = useState({
    dateFrom: today(),
    dateTo: today(),
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeViol, setActiveViol] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Date Picker
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setActiveGroup(null);
    setActiveViol(null);
    const dateTo = `${filters.dateTo} 23:59:59`;
    const res = await getInterventions({ dateFrom: filters.dateFrom, dateTo });
    if (res.success) setData(res.data);
    else Alert.alert("Error", "Failed to load data");
    setLoading(false);
  }

  const grouped = groupData(data);

  const counts = {
    dms: data.filter((i) => (i.safetySource || "").toLowerCase() === "dms")
      .length,
    adas: data.filter((i) => (i.safetySource || "").toLowerCase() === "adas")
      .length,
    harsh: data.filter((i) => (i.safetySource || "").toLowerCase() === "harsh")
      .length,
  };

  function getFiltered() {
    if (activeViol)
      return data.filter(
        (i) => (i.violationEn || i.violationType) === activeViol,
      );
    if (activeGroup)
      return data.filter(
        (i) => (i.safetySource || "").toLowerCase() === activeGroup,
      );
    return data;
  }

  const filtered = getFiltered();

  const handleGroupPress = (id) => {
    if (activeGroup === id && !activeViol) {
      setActiveGroup(null);
    } else {
      setActiveGroup(id);
      setActiveViol(null);
    }
    setSelectedItem(null);
  };

  const handleBarClick = (label) => {
    setActiveViol(label);
    setSelectedItem(null);
  };

  const clearFilter = () => {
    setActiveGroup(null);
    setActiveViol(null);
  };

  return (
    <View style={styles.container}>
      {/* Header Filters */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fleet Safety Overview</Text>
          <Text style={styles.headerSub}>{data.length} events loaded</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateText}>{filters.dateFrom}</Text>
          </TouchableOpacity>
          <Text style={{ color: "#64748b" }}>—</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateText}>{filters.dateTo}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={load}
            disabled={loading}
          >
            <Text style={styles.applyBtnText}>{loading ? "..." : "Apply"}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards (DMS, ADAS, Harsh) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryRow}
        >
          {Object.entries(GC).map(([id, c]) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.summaryCard,
                activeGroup === id && {
                  backgroundColor: c.bg,
                  borderColor: c.border,
                },
              ]}
              onPress={() => handleGroupPress(id)}
            >
              <Text style={[styles.summaryLabel, { color: c.badge }]}>
                {c.label}
              </Text>
              <Text style={styles.summaryCount}>{counts[id]}</Text>
            </TouchableOpacity>
          ))}
          {(activeGroup || activeViol) && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilter}>
              <Text style={styles.clearBtnText}>Clear ✕</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#3b82f6" />
      ) : (
        <ScrollView style={styles.content}>
          {/* Charts */}
          <View style={styles.chartGrid}>
            <ChartCard
              id="dms"
              title="Driver (DMS)"
              data={grouped.dms}
              colorConfig={GC.dms}
              isActive={activeGroup === "dms"}
              onPress={handleGroupPress}
              onBarClick={handleBarClick}
            />
            <ChartCard
              id="adas"
              title="ADAS Alerts"
              data={grouped.adas}
              colorConfig={GC.adas}
              isActive={activeGroup === "adas"}
              onPress={handleGroupPress}
              onBarClick={handleBarClick}
            />
            <ChartCard
              id="harsh"
              title="Harsh Driving"
              data={grouped.harsh}
              colorConfig={GC.harsh}
              isActive={activeGroup === "harsh"}
              onPress={handleGroupPress}
              onBarClick={handleBarClick}
            />
          </View>

          {/* Active Filter Label */}
          {activeViol && (
            <View style={styles.activeFilterContainer}>
              <Text style={styles.activeFilterText}>Filtering by: </Text>
              <Text
                style={[
                  styles.activeFilterValue,
                  { color: activeGroup ? GC[activeGroup].text : "#000" },
                ]}
              >
                {activeViol}
              </Text>
            </View>
          )}

          {/* List */}
          <Text style={styles.listTitle}>
            Recent Violations ({filtered.length})
          </Text>
          <FlatList
            data={filtered}
            scrollEnabled={false}
            keyExtractor={(item) => item.messageId.toString()}
            renderItem={({ item }) => {
              const s = (item.safetySource || "").toLowerCase();
              const c = GC[s];
              const spd = parseInt(item.speed) || 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    selectedItem?.messageId === item.messageId && {
                      backgroundColor: c?.bg || "#f1f5f9",
                    },
                  ]}
                  onPress={() => setSelectedItem(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.itemVehicle}>{item.vehicleId}</Text>
                      {c && (
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: c.bg, borderColor: c.border },
                          ]}
                        >
                          <Text
                            style={[styles.itemBadgeText, { color: c.text }]}
                          >
                            {s.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemViolation}>{item.violationEn}</Text>
                    <Text style={styles.itemLocation}>
                      {item.streetName || item.city}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.itemSpeed,
                        { color: spd > 60 ? "#ef4444" : "#10b981" },
                      ]}
                    >
                      {spd}
                    </Text>
                    <Text style={styles.itemUnit}>km/h</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No data</Text>}
          />
        </ScrollView>
      )}

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={new Date(filters.dateFrom)}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowStartPicker(false);
            if (d)
              setFilters((f) => ({
                ...f,
                dateFrom: d.toISOString().split("T")[0],
              }));
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={new Date(filters.dateTo)}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowEndPicker(false);
            if (d)
              setFilters((f) => ({
                ...f,
                dateTo: d.toISOString().split("T")[0],
              }));
          }}
        />
      )}

      {/* Detail Modal */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#64748b" },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateBtn: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dateText: { fontSize: 12, color: "#334155" },
  applyBtn: {
    backgroundColor: "#4f46e5",
    padding: 8,
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  applyBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    borderColor: "transparent",
  },
  summaryLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  summaryCount: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  clearBtn: {
    backgroundColor: "rgba(226,75,74,0.08)",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(226,75,74,0.35)",
  },
  clearBtnText: { color: "#a32d2d", fontSize: 11, fontWeight: "600" },

  content: { flex: 1, padding: 16 },
  chartGrid: { gap: 12, marginBottom: 16 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },
  chartTitle: { fontSize: 13, fontWeight: "600", color: "#1e293b" },
  chartSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  activeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeBadgeText: { fontSize: 10, fontWeight: "600" },
  emptyChart: { flex: 1, alignItems: "center", justifyContent: "center" },

  activeFilterContainer: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
  },
  activeFilterText: { fontSize: 12, color: "#64748b" },
  activeFilterValue: { fontSize: 12, fontWeight: "700" },

  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  listItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#cbd5e1",
  },
  itemVehicle: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  itemViolation: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
    marginTop: 2,
  },
  itemLocation: { fontSize: 11, color: "#64748b", marginTop: 1 },
  itemSpeed: { fontSize: 16, fontWeight: "800" },
  itemUnit: { fontSize: 10, color: "#64748b" },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  itemBadgeText: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },

  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 20,
    marginBottom: 40,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  sourceText: { fontSize: 12, fontWeight: "600" },
  mediaBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  mediaBtnText: { color: "#fff", fontWeight: "600" },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  infoLabel: { fontSize: 11, color: "#64748b" },
  infoValue: { fontSize: 12, fontWeight: "500", color: "#1e293b" },
});
