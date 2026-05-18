import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// User interface
export interface User {
    id: number;
    email: string;
    name: string;
    organization: string;
    location?: string;
    role: 'farmer' | 'processor' | 'distributor' | 'retailer' | 'consumer' | 'admin';
    createdAt?: string;
}

// Auth context interface
interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

interface RegisterData {
    email: string;
    password: string;
    name: string;
    organization: string;
    role: string;
    location?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - uses environment variable or defaults to localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Enable dummy mode for testing without backend
const DUMMY_MODE = false;

// Dummy user data
const DUMMY_USER: User = {
    id: 1,
    email: 'demo@farmetra.com',
    name: 'Demo Farmer',
    organization: 'Green Valley Farms',
    location: 'Punjab, India',
    role: 'farmer',
    createdAt: new Date().toISOString()
};

// Dummy token
const DUMMY_TOKEN = 'dummy_token_' + Date.now();

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('FARMETRA_token');
            const storedUser = localStorage.getItem('FARMETRA_user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.warn('localStorage access error:', error);
        }
        setIsLoading(false);
    }, []);

    // Login function
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        // Dummy mode: simulate successful login without API call
        if (DUMMY_MODE) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Accept any email/password for demo
            setUser(DUMMY_USER);
            setToken(DUMMY_TOKEN);
            try {
                localStorage.setItem('FARMETRA_token', DUMMY_TOKEN);
                localStorage.setItem('FARMETRA_user', JSON.stringify(DUMMY_USER));
            } catch (e) {
                console.warn('Could not save to localStorage');
            }
            return { success: true };
        }

        // Real API call (when not in dummy mode)
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.token && data.user) {
                setUser(data.user);
                setToken(data.token);
                try {
                    localStorage.setItem('FARMETRA_token', data.token);
                    localStorage.setItem('FARMETRA_user', JSON.stringify(data.user));
                } catch (e) {
                    console.warn('Could not save to localStorage');
                }
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Register function
    const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
        // Dummy mode: simulate successful registration without API call
        if (DUMMY_MODE) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Create a new dummy user with provided data
            const newUser: User = {
                ...DUMMY_USER,
                email: data.email,
                name: data.name,
                organization: data.organization,
                role: data.role as any,
                location: data.location
            };
            
            setUser(newUser);
            setToken(DUMMY_TOKEN);
            try {
                localStorage.setItem('FARMETRA_token', DUMMY_TOKEN);
                localStorage.setItem('FARMETRA_user', JSON.stringify(newUser));
            } catch (e) {
                console.warn('Could not save to localStorage');
            }
            return { success: true };
        }

        // Real API call (when not in dummy mode)
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.user) {
                // Auto-login after registration
                return await login(data.email, data.password);
            } else {
                return { success: false, error: result.error || 'Registration failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Logout function
    const logout = () => {
        setUser(null);
        setToken(null);
        try {
            localStorage.removeItem('FARMETRA_token');
            localStorage.removeItem('FARMETRA_user');
        } catch (e) {
            console.warn('Could not clear localStorage');
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper to get auth token for API calls
export const getAuthToken = (): string | null => {
    return localStorage.getItem('FARMETRA_token');
};

export default AuthContext;
