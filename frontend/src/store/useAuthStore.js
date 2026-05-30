import { create } from 'zustand'
import { supabase } from '../supabaseClient'

export const checkIsPremium = (profile) => {
  if (!profile) return false
  const isSpecialRole = ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin', 'premium'].includes(profile.role)
  if (isSpecialRole) return true
  if (profile.premium_until) {
    const timeStr = typeof profile.premium_until === 'string'
      ? profile.premium_until.replace(' ', 'T')
      : profile.premium_until
    const time = Date.parse(timeStr)
    return !isNaN(time) && time > Date.now()
  }
  return false
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  checkUser: async () => {
    set({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const user = session.user
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        set({ session, user, profile, loading: false })
      } else {
        set({ session: null, user: null, profile: null, loading: false })
      }
    } catch (error) {
      console.error("Error checking user session:", error)
      set({ session: null, user: null, profile: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      const user = data.user
      const session = data.session

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ session, user, profile, loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  loginWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (error) {
      console.error("Error signing in with Google:", error.message)
    }
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })
      if (error) throw error

      set({ loading: false })
      return { success: true, user: data.user }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  verifyOtp: async (email, token, type = 'signup') => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      })
      if (error) throw error

      const user = data.user
      const session = data.session

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ session, user, profile, loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  resendOtp: async (email, type = 'signup') => {
    try {
      const { error } = await supabase.auth.resend({
        type,
        email
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  sendResetPasswordEmail: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updatePassword: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      await supabase.auth.signOut()
      set({ session: null, user: null, profile: null, loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  updateProfile: async (fullName, avatarUrl) => {
    const { user, profile } = get()
    if (!user) return { success: false, error: 'User not logged in' }
    
    try {
      const updates = {
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date()
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates)

      if (error) throw error

      set({ profile: { ...profile, full_name: fullName, avatar_url: avatarUrl } })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  uploadAvatar: async (file) => {
    const { user, profile } = get()
    if (!user) return { success: false, error: 'User not logged in' }

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'File harus berupa gambar (JPG, PNG, WEBP, dll)' }
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Ukuran file maksimal 5MB' }
      }

      // Generate unique filename based on user id
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `avatars/${user.id}/avatar.${ext}`

      // Upload to Supabase Storage (bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl + '?t=' + Date.now() // cache bust

      // Update profile with new avatar URL
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (profileError) throw profileError

      set({ profile: { ...profile, avatar_url: publicUrl } })
      return { success: true, url: publicUrl }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}))
