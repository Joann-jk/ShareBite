import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pjlaezvkkwkqufzjbibs.supabase.co/";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbGFlenZra3drcXVmempiaWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjIwOTQsImV4cCI6MjA3MTQzODA5NH0.B6HR7ahquKHIzi6meXpe2QXS4VW8POiTfIDjWj4sIfU";

export const supabase = createClient(supabaseUrl, supabaseKey);
