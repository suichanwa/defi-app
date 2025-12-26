import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type SecureChatImageAttachment = {
  pendingImageUri: string | null;
  pickImage: () => Promise<void>;
  clearImage: () => void;
  setPendingImageUri: (value: string | null) => void;
};

export function useSecureChatImageAttachment(): SecureChatImageAttachment {
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) setPendingImageUri(uri);
    }
  }, []);

  const clearImage = useCallback(() => {
    setPendingImageUri(null);
  }, []);

  return { pendingImageUri, pickImage, clearImage, setPendingImageUri };
}
