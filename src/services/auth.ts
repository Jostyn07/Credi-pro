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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  // Antes esto solo hacía console.error(error) y no lanzaba nada: si Google no
  // está habilitado o mal configurado en Supabase, el usuario simplemente se
  // quedaba en /login sin ver ningún mensaje -- parecía que "no pasaba nada".
  // Login.tsx y Registro.tsx sí capturan este throw y lo muestran.
  if (error) throw error
}

// Supabase expone Microsoft (Azure AD) como proveedor "azure"
export async function signInWithMicrosoft() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  })
  if (error) throw error
}

// Se usa cuando signIn() falla con error.code === 'email_not_confirmed': le
// permite al usuario pedir un nuevo correo de confirmación sin tener que
// registrarse de nuevo. Mismo emailRedirectTo que signUp(), por la misma
// razón (ver nota ahí arriba).
export async function resendSignupConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}