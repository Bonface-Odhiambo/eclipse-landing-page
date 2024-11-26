"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/userui/ui/button";
import { Input } from "@/userui/ui/input";
import { Select } from "@/userui/ui/select";
import { Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState, FormEvent } from "react";
import SVGLogo from "@/components/svg-logo";

// Define dashboard routes
const DASHBOARD_ROUTES = {
  writer: "/dashboard/writer",
  editor: "/dashboard/editor",
  employer: "/dashboard/employer",
  admin: "/dashboard/admin"
} as const;

export type UserRole = "writer" | "editor" | "employer" | "admin";

interface AuthState {
  error: string;
  success: string;
  isLoading: boolean;
}

// Password Generator Component
const PasswordGenerator = ({ onPasswordSelect }: { onPasswordSelect: (password: string) => void }) => {
  const generatePassword = () => {
    const chars = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: '!@#$%^&*(),.?":{}|<>'
    };
    
    // Get one of each required character type
    const requiredChars = [
      chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)],
      chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)],
      chars.numbers[Math.floor(Math.random() * chars.numbers.length)],
      chars.symbols[Math.floor(Math.random() * chars.symbols.length)]
    ];
    
    const allChars = Object.values(chars).join('');
    const remainingLength = 8;
    const remainingChars = Array.from(
      { length: remainingLength }, 
      () => allChars[Math.floor(Math.random() * allChars.length)]
    );
    
    const password = [...requiredChars, ...remainingChars]
      .sort(() => Math.random() - 0.5)
      .join('');
    
    onPasswordSelect(password);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={generatePassword}
      className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 h-8"
    >
      <RefreshCw className="h-3 w-3 mr-2" />
      Generate Strong Password
    </Button>
  );
};

export function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [authState, setAuthState] = useState<AuthState>({
    error: "",
    success: "",
    isLoading: false
  });

  const supabase = createClientComponentClient();


  const handleSignIn = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "on";
  
    try {
      if (!email || !password) {
        throw new Error("Please enter both email and password");
      }
  
      setAuthState(prev => ({ ...prev, isLoading: true, error: "", success: "" }));
  
      // Sign in with Supabase
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          cookieOptions: {
            maxAge: rememberMe ? 30 * 24 * 60 * 60 : 60 * 60
          }
        }
      });
  
      if (signInError) {
        if (signInError.message?.includes('Email not confirmed')) {
          await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            }
          });
          throw new Error('Please confirm your email first. A new confirmation email has been sent.');
        }
        throw new Error(signInError.message || 'Authentication failed');
      }
  
      if (!session) {
        throw new Error('Authentication failed - no session established');
      }
  
      console.log('Session established:', session); // Debug log
  
      // Get user role from a separate query instead of metadata
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
  
      console.log('User role data:', userRole); // Debug log
  
      if (roleError || !userRole) {
        console.error('Role error:', roleError); // Debug log
        throw new Error('Unable to retrieve user role');
      }
  
      const role = userRole.role as keyof typeof DASHBOARD_ROUTES;
      
      if (!DASHBOARD_ROUTES[role]) {
        throw new Error(`Invalid role: ${role}`);
      }
  
      console.log('Redirecting to:', DASHBOARD_ROUTES[role]); // Debug log
  
      setAuthState(prev => ({ 
        ...prev, 
        success: "Successfully signed in. Redirecting...",
        isLoading: false 
      }));
  
      // Add a small delay before redirect to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 500));
  
      // Try both routing methods
      try {
        await router.push(DASHBOARD_ROUTES[role]);
      } catch (routerError) {
        console.error('Router push failed:', routerError);
        // Fallback to window.location if router fails
        window.location.href = DASHBOARD_ROUTES[role];
      }
  
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to sign in",
        isLoading: false
      }));
    }
  };

const handleSignUp = async (formData: FormData) => {
  const fields = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    phone: formData.get("phone") as string,
    role: formData.get("role") as UserRole,
    terms: formData.get("terms") as string
  };

  try {
    const missingFields = Object.entries(fields)
      .filter(([, value]) => !value)
      .map(([fieldName]) => fieldName);

    if (missingFields.length > 0) {
      throw new Error(
        `Please fill in all required fields: ${missingFields
          .map(field => field.charAt(0).toUpperCase() + field.slice(1))
          .join(", ")}`
      );
    }

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'signup',
        ...fields
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    setAuthState(prev => ({
      ...prev,
      success: data.message || "Account created successfully! Please check your email to confirm your account."
    }));
    resetForm();

  } catch (error) {
    console.error('Signup error:', error);
    setAuthState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : "Registration failed"
    }));
  }
};

const handleForgotPassword = async () => {
  const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
  const email = emailInput?.value;
  
  if (!email) {
    setAuthState(prev => ({ ...prev, error: "Please enter your email address" }));
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    
    setAuthState(prev => ({
      ...prev,
      success: "Password reset instructions have been sent to your email",
      error: ""
    }));
  } catch (error) {
    setAuthState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : "Failed to send reset instructions"
    }));
  }
};

const handleResendConfirmation = async (email: string) => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    
    setAuthState(prev => ({
      ...prev,
      success: "Confirmation email has been resent!",
      error: ""
    }));
  } catch (error) {
    setAuthState(prev => ({
      ...prev,
      error: "Failed to resend confirmation email"
    }));
  }
};

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  await (mode === "signin" ? handleSignIn(formData) : handleSignUp(formData));
};

const resetForm = () => {
  setPasswordValue("");
  const form = document.querySelector('form');
  if (form) form.reset();
};

const handleModeChange = () => {
  resetForm();
  setAuthState({ error: "", success: "", isLoading: false });
  setMode(mode === "signin" ? "signup" : "signin");
};



const renderAuthHeader = () => (
  <>
    <div className="flex justify-center scale-75">
      <SVGLogo />
    </div>
    <h1 className="mt-4 text-xl font-semibold tracking-tight text-center text-gray-900">
      {mode === "signin" ? "Welcome to Eclipse Writers" : "Create your account"}
    </h1>
    <p className="mt-1 text-sm text-center text-gray-600">
      {mode === "signin"
        ? "Sign in to continue to your account"
        : "Get started with Eclipse Writers"}
    </p>
  </>
);

const renderAuthForm = () => (
  <form onSubmit={handleSubmit} className="space-y-3">
    {mode === "signup" && (
      <>
        <div className="flex gap-3">
          <Input
            name="firstName"
            type="text"
            placeholder="First Name"
            required
            autoComplete="given-name"
            className="px-3 h-10 bg-white rounded-lg border-gray-200 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
          />
          <Input
            name="lastName"
            type="text"
            placeholder="Last Name"
            required
            autoComplete="family-name"
            className="px-3 h-10 bg-white rounded-lg border-gray-200 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <Input
          name="phone"
          type="tel"
          placeholder="Phone Number"
          required
          autoComplete="tel"
          className="px-3 h-10 bg-white rounded-lg border-gray-200 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
        />
        <Select
          name="role"
          required
          className="h-10 bg-white rounded-lg border-gray-200 shadow-sm"
        >
          <option value="">Select Role</option>
          {Object.keys(DASHBOARD_ROUTES).map(role => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </Select>
      </>
    )}
    
    <Input
      name="email"
      type="email"
      placeholder="Email address"
      required
      autoComplete={mode === "signin" ? "username" : "email"}
      className="px-3 h-10 bg-white rounded-lg border-gray-200 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
    />

    <div className="space-y-2">
      <div className="relative">
        <Input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={passwordValue}
          onChange={(e) => setPasswordValue(e.target.value)}
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="px-3 h-10 bg-white rounded-lg border-gray-200 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {mode === "signup" && (
        <>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{" "}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms and Conditions
              </Link>
            </label>
          </div>
          <PasswordGenerator onPasswordSelect={setPasswordValue} />
        </>
      )}
    </div>

    {mode === "signin" && (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            name="rememberMe"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={authState.isLoading}
          className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
        >
          Forgot password?
        </button>
      </div>
    )}

    {authState.error && (
      <div className="p-3 text-center bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">{authState.error}</p>
      </div>
    )}

    <Button
      type="submit"
      disabled={authState.isLoading}
      className="w-full h-10 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {authState.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : mode === "signin" ? (
        "Sign In"
      ) : (
        "Create Account"
      )}
    </Button>
  </form>
);

return (
  <div className="h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
    <div className="w-full max-w-md">
      {renderAuthHeader()}
      <div className="mt-6">
        {authState.success ? (
          <div className="p-4 text-center bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">
              {mode === "signin" ? "Authentication Successful" : "Registration Successful"}
            </h3>
            <p className="mt-1 text-sm text-green-700">{authState.success}</p>
            {mode === "signup" && !authState.success.includes("confirm") && (
              <button
                onClick={() => {
                  const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
                  if (email) handleResendConfirmation(email);
                }}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Resend confirmation email
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {renderAuthForm()}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {mode === "signin" ? "New to our Platform? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={handleModeChange}
                  className="text-blue-600 hover:underline"
                >
                  {mode === "signin" ? "Create your account" : "Sign in here"}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default Login;