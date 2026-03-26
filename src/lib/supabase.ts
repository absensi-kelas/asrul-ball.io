import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irsgvzdlyzmahrweudiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlyc2d2emRseXptYWhyd2V1ZGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDIzNTQsImV4cCI6MjA5MDA3ODM1NH0.6AjNom1nQA86kwN_oTh19_-7vE6d-Bgai3QuZCdXc9M';

export const supabase = createClient(supabaseUrl, supabaseKey);
