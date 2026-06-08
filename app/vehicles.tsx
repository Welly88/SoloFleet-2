import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Image, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Zap, Shield, X, ChevronRight, Clock } from 'lucide-react-native';

type Vehicle = {
  id: string;
  name: string;
  policeNumber: string;
  location: string;
  status: 'moving' | 'stopped' | 'idle';
  speed: number;
  engineOn: boolean;
  lastUpdated: string;
  image: string;
};

// Mock Data
const vehicles: Vehicle[] = [
  {
    id: '1',
    name: 'Toyota Avanza',
    policeNumber: 'B 1234 CD',
    location: 'Jl. Sudirman, Jakarta Pusat',
    status: 'moving',
    speed: 45,
    engineOn: true,
    lastUpdated: '2 mins ago',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c2VkYW58ZW58MHx8MHx8fDA%3D',
  },
  {
    id: '2',
    name: 'Isuzu Elf Truck',
    policeNumber: 'B 5678 EF',
    location: 'Tol Jagorawi, KM 20',
    status: 'moving',
    speed: 70,
    engineOn: true,
    lastUpdated: 'Just now',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8bW90b3JjeWNsZXxlbnwwfHwwfHx8MA%3D%3D',
  },
  {
    id: '3',
    name: 'Honda Beat',
    policeNumber: 'B 9012 GH',
    location: 'Jl. Thamrin, Jakarta',
    status: 'stopped',
    speed: 0,
    engineOn: false,
    lastUpdated: '15 mins ago',
    image: 'https://images.unsplash.com/photo-1629952466919-17df8121bfe9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cm9hZCUyMG91dGRvb3JzJTIwdmVoaWNsZXxlbnwwfHwwfHx8MA%3D%3D',
  },
  {
    id: '4',
    name: 'Yamaha NMAX',
    policeNumber: 'B 3456 IJ',
    location: 'Pasar Minggu, Jakarta Selatan',
    status: 'idle',
    speed: 0,
    engineOn: true,
    lastUpdated: '5 mins ago',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8bW90b3JjeWNsZXxlbnwwfHwwfHx8MA%3D%3D',
  },
];

export default function VehiclesScreen() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving':
        return 'bg-green-500'; // Green for moving
      case 'stopped':
        return 'bg-red-500'; // Red for stopped
      case 'idle':
        return 'bg-yellow-500'; // Yellow for idle
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <Pressable
      onPress={() => setSelectedVehicle(item)}
      className="bg-card border border-border rounded-2xl p-4 mb-4 flex-row items-center shadow-sm active:opacity-70"
    >
      <Image source={{ uri: item.image }} className="w-20 h-20 rounded-xl mr-4" />
      
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-lg font-bold text-foreground">{item.name}</Text>
          <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
            <Text className="text-xs font-bold text-white">{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        <Text className="text-sm text-muted-foreground mb-1">{item.policeNumber}</Text>
        
        <View className="flex-row items-center mt-2">
          <MapPin size={14} className="text-primary mr-1" />
          <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>

      <ChevronRight className="text-muted-foreground ml-2" size={20} />
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 border-b border-border bg-card">
        <Text className="text-2xl font-bold text-foreground">My Vehicles</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          {vehicles.length} vehicles active
        </Text>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 128 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-muted-foreground">No vehicles found</Text>
          </View>
        }
      />

      {/* Vehicle Detail Modal */}
      <Modal
        visible={!!selectedVehicle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card rounded-t-3xl p-6 w-full border-t border-border">
            {/* Handle Bar */}
            <View className="w-12 h-1 bg-muted-foreground/30 rounded-full self-center mb-6" />

            {selectedVehicle && (
              <ScrollView>
                {/* Header */}
                <View className="flex-row items-start justify-between mb-6">
                  <View className="flex-1">
                    <Text className="text-2xl font-bold text-foreground">{selectedVehicle.name}</Text>
                    <Text className="text-lg text-muted-foreground">{selectedVehicle.policeNumber}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedVehicle(null)} className="p-2">
                    <X size={24} className="text-muted-foreground" />
                  </Pressable>
                </View>

                {/* Status Badge */}
                <View className={`self-start px-4 py-2 rounded-full ${getStatusColor(selectedVehicle.status)} mb-6`}>
                  <Text className="text-sm font-bold text-white">
                    {getStatusText(selectedVehicle.status)}
                  </Text>
                </View>

                {/* Details Grid */}
                <View className="gap-4">
                  {/* Location */}
                  <View className="bg-background rounded-xl p-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4">
                      <MapPin size={20} className="text-red-500" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground mb-1">Current Location</Text>
                      <Text className="text-sm font-medium text-foreground">{selectedVehicle.location}</Text>
                    </View>
                  </View>

                  {/* Speed */}
                  <View className="bg-background rounded-xl p-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-yellow-500/10 items-center justify-center mr-4">
                      <Zap size={20} className="text-yellow-500" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground mb-1">Speed</Text>
                      <Text className="text-sm font-medium text-foreground">{selectedVehicle.speed} km/h</Text>
                    </View>
                  </View>

                  {/* Engine Status */}
                  <View className="bg-background rounded-xl p-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-green-500/10 items-center justify-center mr-4">
                      <Shield size={20} className={selectedVehicle.engineOn ? "text-green-500" : "text-muted-foreground"} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground mb-1">Engine Status</Text>
                      <Text className="text-sm font-medium text-foreground">
                        {selectedVehicle.engineOn ? 'Running' : 'Off'}
                      </Text>
                    </View>
                  </View>

                  {/* Last Updated */}
                  <View className="bg-background rounded-xl p-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center mr-4">
                      <Clock size={20} className="text-blue-500" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground mb-1">Last Updated</Text>
                      <Text className="text-sm font-medium text-foreground">{selectedVehicle.lastUpdated}</Text>
                    </View>
                  </View>
                </View>

                {/* Close Button */}
                <Pressable
                  onPress={() => setSelectedVehicle(null)}
                  className="bg-primary rounded-xl py-4 mt-6 items-center"
                >
                  <Text className="text-primary-foreground font-semibold">Close</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}