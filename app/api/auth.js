import AsyncStorage from "@react-native-async-storage/async-storage";

const LOGIN_API = "https://api.solofleet.com/SFvehicle/vehiclecondense";
const INTERNAL_LOGIN_API = "https://internalwebapp.solofleet.com/Account/Login";

export const loginInternal = async (username, password) => {
  try {
    const response = await fetch(INTERNAL_LOGIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    return response.ok && result.success
      ? { success: true, message: "Login Internal Berhasil", data: result }
      : { success: false, message: result.message || "Login Internal Gagal" };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const login = async (username, password) => {
  try {
    const response = await fetch(
      `${LOGIN_API}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=json`
    );
    const result = await response.json();
    const vehicles = result?.modeloutput?.vehicles || [];

    if (!result.success || vehicles.length === 0) {
      return { success: false, message: "Username/password salah" };
    }

    // Mapping data sesuai JSON response yang baru
    const parsed = vehicles.map((item) => ({
      vehicleid: String(item.vehicleid),
      alias: item.alias?.trim(),
      
      // Lokasi & Dasar
      lat: item.y,
      lng: item.x,
      latitude: item.y,
      longitude: item.x,
      speed: item.spd,
      gpstime: item.lastupdated,
      
      // Status Engine & Sensor
      IP1: item.IP1, // Engine (0=Off, 1=On)
      
      // Temperature (Menggunakan vtemp1 dan vtemp2 dari JSON)
      temp1: item.vtemp1, 
      temp2: item.vtemp2,
      
      // Door (Format string "000000000")
      door: item.door,

      // Alamat
      stn: item.stn,
      subd: item.subd,
      dnm: item.dnm,
      City: item.City,
      Province: item.Province,
      zonename: item.zonename,
      
      // Info Tambahan
      status: item.err_gps || "Online",
      camera: item.isusecamera,
      image: item.imgCar1,
      companyid: item.companyid,
    }));

    await AsyncStorage.setItem("userName", username);
    await AsyncStorage.setItem("password", password); 
    await AsyncStorage.setItem("companyId", String(parsed[0]?.companyid));
    await AsyncStorage.setItem("vehicles", JSON.stringify(parsed));
    await AsyncStorage.setItem("vehicleIDs", JSON.stringify(parsed.map((x) => x.vehicleid)));

    const internalResult = await loginInternal(username, password);
    if (!internalResult.success) console.warn("Peringatan: Gagal login ke internal API.");

    return { success: true, message: "Login berhasil", data: parsed };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const getVehicleData = async () => {
  try {
    const data = await AsyncStorage.getItem("vehicles");
    return { success: true, data: data ? JSON.parse(data) : [] };
  } catch {
    return { success: false, data: [] };
  }
};

export const getCompanyId = async () => {
  try {
    return await AsyncStorage.getItem("companyId");
  } catch {
    return null;
  }
};

export const logout = async () => {
  await AsyncStorage.clear();
};

export const isAuthenticated = async () => {
  return !!(await AsyncStorage.getItem("userName"));
};