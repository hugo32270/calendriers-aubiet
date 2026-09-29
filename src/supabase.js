import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mpdmlopizezgniwydlxr.supabase.co'

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZG1sb3BpemV6Z25pd3lkbHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2Njg5ODQsImV4cCI6MjEwNjI0NDk4NH0.gKwQYP-IyURX6panerqpAmrJhO9VugBhIIaMDtb4dBo'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)