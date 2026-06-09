import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yejiqenqdzupauddjcyi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllamlxZW5xZHp1cGF1ZGRqY3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc2NzIsImV4cCI6MjA5NTE0MzY3Mn0.KGxv8U9Zr1EC1ItAPYL4oy4rAaZjAmGVGGw1VsGKLbE'
);
