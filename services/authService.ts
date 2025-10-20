export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
}

/**
 * Authentication service for Google Sign-In
 * Provides basic OAuth authentication without sync
 */
export class AuthService {
  private currentUser: User | null = null;
  private readonly STORAGE_KEY = 'ai-agent-browser-auth';
  private readonly TOKEN_KEY = 'ai-agent-browser-token';

  constructor() {
    this.loadUser();
  }

  /**
   * Sign in with Google OAuth
   * Note: This is a simplified implementation
   * Full implementation would use Google OAuth 2.0 flow
   */
  async signInWithGoogle(): Promise<User> {
    // In a real implementation, this would:
    // 1. Open OAuth popup window
    // 2. Redirect to Google OAuth consent screen
    // 3. Handle callback with authorization code
    // 4. Exchange code for access token
    // 5. Fetch user info from Google API

    // For now, return a mock implementation
    throw new Error('Google Sign-In not yet fully implemented. This requires OAuth 2.0 setup with Google Cloud Console.');
    
    // Mock user for development:
    // const mockUser: User = {
    //   id: 'mock-user-id',
    //   email: 'user@example.com',
    //   name: 'Test User',
    //   picture: 'https://via.placeholder.com/150',
    //   provider: 'google',
    // };
    // 
    // this.currentUser = mockUser;
    // this.saveUser(mockUser);
    // this.storeAuthToken('mock-token');
    // 
    // return mockUser;
  }

  /**
   * Sign in with mock user (for development/testing)
   */
  async signInWithMockUser(email: string, name: string): Promise<User> {
    const mockUser: User = {
      id: `mock-${Date.now()}`,
      email,
      name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      provider: 'google',
    };

    this.currentUser = mockUser;
    this.saveUser(mockUser);
    this.storeAuthToken(`mock-token-${Date.now()}`);

    return mockUser;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.currentUser = null;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Store authentication token securely
   */
  private storeAuthToken(token: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // In production, this should be encrypted or use secure storage
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Retrieve authentication token
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Save user to localStorage
   */
  private saveUser(user: User): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    }
  }

  /**
   * Load user from localStorage
   */
  private loadUser(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem(this.STORAGE_KEY);
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
        } catch (error) {
          console.error('Failed to load user from storage:', error);
        }
      }
    }
  }

  /**
   * Validate token (placeholder for future implementation)
   */
  async validateToken(): Promise<boolean> {
    const token = this.getAuthToken();
    if (!token) return false;

    // In a real implementation, this would validate the token with Google
    // For now, just check if it exists
    return token.length > 0;
  }

  /**
   * Refresh token (placeholder for future implementation)
   */
  async refreshToken(): Promise<string | null> {
    // In a real implementation, this would refresh the OAuth token
    console.warn('Token refresh not yet implemented');
    return null;
  }
}

export const authService = new AuthService();

