import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  isCompact: boolean;
  onConnectPress: () => void;
  onHostPress: () => void;
  timeLabel?: string;
  locationLabel?: string;
};

export default function ChatHeader({ isCompact, onConnectPress, onHostPress, timeLabel, locationLabel }: Props) {
  return (
    <View className={`${isCompact ? 'flex-col' : 'flex-row items-center justify-between'}`}>
      <View>
        <Text className="text-2xl font-bold text-slate-900">Secure Chat</Text>
        <Text className="mt-1 text-slate-500">Components mirrored from repo/secureChat</Text>
        {(timeLabel || locationLabel) && (
          <View className="mt-2 flex-row flex-wrap">
            {timeLabel && <Text className="mr-2 text-xs text-slate-500">Local time: {timeLabel}</Text>}
            {locationLabel && <Text className="text-xs text-slate-400">{locationLabel}</Text>}
          </View>
        )}
      </View>
      <View className={isCompact ? 'mt-3 w-full' : 'flex-row items-center'}>
        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-xl bg-slate-200 px-4 py-3 ${isCompact ? 'w-full' : ''}`}
          onPress={onConnectPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="lan-connect" color="#111827" size={18} />
          <Text className="ml-2 font-semibold text-slate-900">Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 ${
            isCompact ? 'mt-2 w-full' : 'ml-3'
          }`}
          onPress={onHostPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="rocket-launch" color="#ffffff" size={18} />
          <Text className="ml-2 font-semibold text-white">Host server</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
