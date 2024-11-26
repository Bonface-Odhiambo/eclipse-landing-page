import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Define allowed roles
const ALLOWED_ROLES = ['admin', 'editor', 'writer', 'employer'] as const;
type UserRole = typeof ALLOWED_ROLES[number];

// Request interfaces
interface BaseRequestData {
  action: string;
}
// Add these type definitions after your existing interfaces
interface UserMetadata {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata: UserMetadata;
  email_confirmed_at?: Date;
}

interface Session {
  user: AuthUser;
}

interface AuthResponse {
  data: {
    user: AuthUser | null;
    session: Session | null;
  };
  error: Error | null;
}
interface AdminAuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

interface AdminListUsersResponse {
  data: {
    users: AdminAuthUser[];
  };
  error: Error | null;
}
interface SignupRequestData extends BaseRequestData {
  action: 'signup';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}

interface SigninRequestData extends BaseRequestData {
  action: 'signin';
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface ResetPasswordRequestData extends BaseRequestData {
  action: 'resetPassword';
  email: string;
}

interface ForgotPasswordRequestData extends BaseRequestData {
  action: 'forgotPassword';
  email: string;
}

interface LogoutRequestData extends BaseRequestData {
  action: 'logout';
}

type RequestData = SignupRequestData | SigninRequestData | LogoutRequestData | 
  ResetPasswordRequestData | ForgotPasswordRequestData;

// Validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  return { isValid: true, message: '' };
};

// Error logging with enhanced details
const logError = (context: string, error: any) => {
  console.error(`[${context}] Error:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

// Initialize Supabase clients with proper configuration
const initSupabase = (cookieStore: ReturnType<typeof cookies>) => {
  const supabase = createRouteHandlerClient({ 
    cookies: () => cookieStore,
  });
  
  const adminClient = createClient(
    'https://kxjytpekabiyaykwtuly.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4anl0cGVrYWJpeWF5a3d0dWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTk5NDQzOCwiZXhwIjoyMDQ3NTcwNDM4fQ.r0_PrgMzu2syP0QMCUPh46rxFHG-s1pLz6-TSxxIqBA',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        debug: true
      }
    }
  );

  return { supabase, adminClient };
};

// Helper function to verify email existence
const checkEmailExists = async (supabase: any, adminClient: any, email: string) => {
  try {
    const { data, error } = await adminClient.auth.admin.listUsers() as AdminListUsersResponse;

    if (error) {
      logError('checkEmailExists:authUser', error);
      return false;
    }

    const existingAuthUser = data.users.find((user: AdminAuthUser) => user.email === email);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    return !!(existingAuthUser || existingUser);
  } catch (error) {
    logError('checkEmailExists', error);
    return false;
  }
};

// Enhanced verification function with retries
const verifyAuthUser = async (adminClient: any, userId: string): Promise<boolean> => {
  try {
    // Add delay before verification
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try multiple times in case of delay in auth user creation
    for (let i = 0; i < 3; i++) {
      const { data, error } = await adminClient.auth.admin.getUserById(userId);
      
      if (!error && data?.user) {
        return true;
      }

      // If not found, wait and try again
      if (i < 2) {  // Don't wait on last attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  } catch (error) {
    logError('verifyAuthUser', error);
    return false;
  }
};

// Helper function to verify role eligibility
const verifyRoleEligibility = async (supabase: any, email: string, role: UserRole) => {
  try {
    if (role !== 'admin' && role !== 'editor') {
      return true;
    }

    const { data: approvedUser, error: approvedError } = await supabase
      .from('approved_users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .eq('is_used', false)
      .single();

    if (approvedError || !approvedUser) {
      return false;
    }

    return true;
  } catch (error) {
    logError('verifyRoleEligibility', error);
    return false;
  }
};

// Clean up helper for failed signups
const cleanupFailedSignup = async (adminClient: any, userId: string) => {
  try {
    // First, try to delete from users table
    await adminClient
      .from('users')
      .delete()
      .eq('id', userId);

    // Then, delete from user_roles
    await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Finally, delete the auth user
    await adminClient.auth.admin.deleteUser(userId);
  } catch (error) {
    logError('cleanupFailedSignup', error);
  }
};
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const { supabase, adminClient } = initSupabase(cookieStore);
    const requestData = await request.json() as RequestData;
    const { action } = requestData;

    // Handle Password Reset/Forgot Password
    if (action === 'forgotPassword' || action === 'resetPassword') {
      const { email } = requestData as ForgotPasswordRequestData | ResetPasswordRequestData;

      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      });

      if (error) {
        logError('resetPassword', error);
        return NextResponse.json(
          { error: 'Unable to process password reset request' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Password reset instructions have been sent to your email'
      });
    }

    // Handle Logout
    if (action === 'logout') {
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        logError('logout', signOutError);
        return NextResponse.json(
          { error: 'Unable to sign out' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
        redirectTo: '/sign-in'
      });
    }

    // Handle Sign Up
    if (action === 'signup') {
      const { email, password, firstName, lastName, phone, role } = requestData as SignupRequestData;

      // Input validation
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
      }

      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
      }

      try {
        // Check if email exists
        const emailExists = await checkEmailExists(supabase, adminClient, email);
        if (emailExists) {
          return NextResponse.json(
            { error: 'Email already registered' },
            { status: 400 }
          );
        }

        // Verify role eligibility
        const isEligible = await verifyRoleEligibility(supabase, email, role);
        if (!isEligible) {
          return NextResponse.json(
            { error: 'You are not authorized to register with this role' },
            { status: 403 }
          );
        }

        // Create auth user
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role
          }
        }
      }) as AuthResponse;

        if (signUpError || !user) {
          throw new Error(signUpError?.message || 'Failed to create user');
        }

        // Initial delay after user creation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify user with retries
        const authUserExists = await verifyAuthUser(adminClient, user.id);
        if (!authUserExists) {
          // Check if the user was actually created despite verification failure
          const { data } = await adminClient.auth.admin.listUsers();
          const createdUser = data?.users?.find(u => u.email === email);

          if (createdUser) {
            // User exists, update the user id
            user.id = createdUser.id;
          } else {
            throw new Error('Failed to verify user creation - please try again');
          }
        }

        // Create user profile
        const { data, error } = await adminClient.rpc('create_user_profile', {
          user_id: user.id,
          user_email: email,
          user_first_name: firstName,
          user_last_name: lastName,
          user_phone: phone,
          user_role: role
        });

        if (error || !data?.success) {
          logError('createProfile', error || data?.error);
          await cleanupFailedSignup(adminClient, user.id);
          throw new Error(error?.message || data?.error || 'Failed to create user profile');
        }

        // Mark approved user as used if applicable
        if (role === 'admin' || role === 'editor') {
          await supabase
            .from('approved_users')
            .update({ is_used: true })
            .eq('email', email)
            .eq('role', role);
        }

        return NextResponse.json({
          success: true,
          message: 'Please check your email to confirm your account',
          requiresConfirmation: true
        });

      } catch (error) {
        logError('signup', {
          error,
          context: 'User signup process failed',
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Registration failed' },
          { status: 500 }
        );
      }
    }

    // Handle Sign In
    if (action === 'signin') {
      const { email, password } = requestData as SigninRequestData;
      
      if (!isValidEmail(email) || !password) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 400 }
        );
      }

      try {
        const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !session?.user) {
          return NextResponse.json(
            { error: signInError?.message || 'Authentication failed' },
            { status: 400 }
          );
        }

        const user = session.user;

        // Check email confirmation
        if (!user.email_confirmed_at) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
            }
          });

          if (resendError) {
            logError('resendConfirmation', resendError);
          }

          return NextResponse.json({
            error: 'Please confirm your email before signing in',
            requiresConfirmation: true,
            message: 'A new confirmation email has been sent'
          }, { status: 400 });
        }

        // Get user role
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || !userRole) {
          logError('getUserRole', roleError);
          return NextResponse.json(
            { error: 'Unable to retrieve user role' },
            { status: 400 }
          );
        }

        return NextResponse.json({ 
          success: true,
          redirectTo: `/dashboard/${userRole.role}`,
          user: {
            id: user.id,
            email: user.email,
            role: userRole.role,
            firstName: user.user_metadata.first_name,
            lastName: user.user_metadata.last_name
          }
        });

      } catch (error) {
        logError('signin', error);
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logError('routeHandler', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}