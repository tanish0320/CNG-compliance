import AsyncStorage from "@react-native-async-storage/async-storage";

const SECURE_TOKEN_KEY = "@cng_compliance_secure_auth_token_v1";
const SECURE_REFRESH_TOKEN_KEY = "@cng_compliance_secure_refresh_token_v1";
const USER_PROFILE_KEY = "@cng_compliance_user_profile_v1";

export class SecureStorageService {
  /** Save access token securely */
  public static async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(SECURE_TOKEN_KEY, token);
  }

  /** Retrieve access token */
  public static async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(SECURE_TOKEN_KEY);
  }

  /** Save refresh token securely */
  public static async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(SECURE_REFRESH_TOKEN_KEY, token);
  }

  /** Retrieve refresh token */
  public static async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(SECURE_REFRESH_TOKEN_KEY);
  }

  /** Save authenticated user profile */
  public static async setUserProfile(profile: any): Promise<void> {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  }

  /** Retrieve authenticated user profile */
  public static async getUserProfile(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  /** Clear all credentials upon logout */
  public static async clearCredentials(): Promise<void> {
    await AsyncStorage.removeItem(SECURE_TOKEN_KEY);
    await AsyncStorage.removeItem(SECURE_REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
  }
}
