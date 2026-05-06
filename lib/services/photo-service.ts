import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export interface PhotoData {
  uri: string;
  type: "image/jpeg" | "image/png";
  fileName: string;
  size: number;
}

class PhotoService {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Camera permission request failed:", error);
      return false;
    }
  }

  async pickImage(): Promise<PhotoData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: "image/jpeg",
        fileName: `photo_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
      };
    } catch (error) {
      console.error("Failed to pick image:", error);
      return null;
    }
  }

  async takePhoto(): Promise<PhotoData | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: "image/jpeg",
        fileName: `photo_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
      };
    } catch (error) {
      console.error("Failed to take photo:", error);
      return null;
    }
  }

  async uploadPhotoToS3(photo: PhotoData, s3Url: string): Promise<boolean> {
    try {
      // Read file as base64
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("file", blob, photo.fileName);

      // Upload to S3 (using presigned URL or direct upload)
      const uploadResponse = await fetch(s3Url, {
        method: "PUT",
        headers: {
          "Content-Type": photo.type,
        },
        body: blob,
      });

      return uploadResponse.ok;
    } catch (error) {
      console.error("Failed to upload photo:", error);
      return false;
    }
  }

  async getPhotoBase64(photo: PhotoData): Promise<string | null> {
    try {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(",")[1] || null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to get base64:", error);
      return null;
    }
  }
}

export const photoService = new PhotoService();

export function usePhotoService() {
  const pickImage = async (): Promise<PhotoData | null> => {
    return photoService.pickImage();
  };

  const takePhoto = async (): Promise<PhotoData | null> => {
    return photoService.takePhoto();
  };

  const uploadPhoto = async (photo: PhotoData, s3Url: string): Promise<boolean> => {
    return photoService.uploadPhotoToS3(photo, s3Url);
  };

  return {
    pickImage,
    takePhoto,
    uploadPhoto,
  };
}
