import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fsgflmlmpoodpvxavfvc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
