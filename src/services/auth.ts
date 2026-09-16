import { supabase } from '@/lib/supabaseClient'

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Sin esto, Supabase redirige al Site URL configurado en el dashboard
      // (Authentication > URL Configuration), que puede no coincidir con el
      // origen real desde el que se registró el usuario (localhost en dev,
      // dominio de producción en prod). Al ser explícito, siempre vuelve al
      // mismo origen desde el que se hizo el registro.
      // IMPORTANTE: esta URL debe estar en la lista de "Redirect URLs"
      // permitidas en Supabase, o el enlace del correo fallará.
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) throw error
  return data
}

// Supabase expone Microsoft (Azure AD) como proveedor "azure"
export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) throw error
  return data
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  })
  if (error) throw error
}