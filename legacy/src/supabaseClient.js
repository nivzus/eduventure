import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Создаем и экспортируем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
