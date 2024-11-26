import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    'https://kxjytpekabiyaykwtuly.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4anl0cGVrYWJpeWF5a3d0dWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5OTQ0MzgsImV4cCI6MjA0NzU3MDQzOH0.y2UWR8IqFYgox9k_xvUSBn33aelIcTSHQGl9k_ib1Bw',
  );
}
