import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type SecureChatImageAttachment = {
  pickImage: () => Promise<void>;
  clearImage: () => void;
};

export function useSecureChatImageAttachment(onAttachmentChange: (value: string | null) => void): SecureChatImageAttachment {
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
    if (result.canceled) return;
    if (!result.assets || result.assets.length === 0) {
      Alert.alert('Image selection failed', 'Unable to read the selected image.');
      return;
    }
    const uri = result.assets[0]?.uri;
    if (!uri) {
      Alert.alert('Image selection failed', 'Unable to read the selected image.');
      return;
    }
    onAttachmentChange(uri);
  }, [onAttachmentChange]);

  const clearImage = useCallback(() => {
    onAttachmentChange(null);
  }, [onAttachmentChange]);

  return { pickImage, clearImage };
}
