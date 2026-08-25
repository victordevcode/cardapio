import { createClient } from '@supabase/supabase-js';

// Substitua pelas credenciais do seu painel Supabase (Project Settings -> API)
const supabaseUrl = 'https://kibexqwtcypwaldgsnba.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYmV4cXd0Y3lwd2FsZGdzbmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzg3ODUsImV4cCI6MjEwMjgxNDc4NX0.jL14Ed0zETOKOqjer4d7RGz2OR__E_Lw2Q8In8QLdIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

