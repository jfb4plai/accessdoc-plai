import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TeacherProfile } from '../types'

interface UseProfilesReturn {
  profiles: TeacherProfile[]
  loading: boolean
  error: string | null
  createProfile: (data: Omit<TeacherProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<TeacherProfile | null>
  updateProfile: (id: string, data: Partial<TeacherProfile>) => Promise<boolean>
  deleteProfile: (id: string) => Promise<boolean>
  setDefaultProfile: (id: string) => Promise<boolean>
  refetch: () => void
}

export function useProfiles(): UseProfilesReturn {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: supaErr } = await supabase
        .from('teacher_profiles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (supaErr) throw supaErr
      setProfiles((data as TeacherProfile[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des profils')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const createProfile = async (
    data: Omit<TeacherProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<TeacherProfile | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      if (data.is_default) {
        await supabase
          .from('teacher_profiles')
          .update({ is_default: false })
          .eq('is_default', true)
      }

      const { error: supaErr } = await supabase
        .from('teacher_profiles')
        .insert({ ...data, user_id: user.id })

      if (supaErr) throw supaErr

      // Récupère le profil créé séparément pour éviter le 409 RLS
      const { data: newProfile } = await supabase
        .from('teacher_profiles')
        .select()
        .eq('user_id', user.id)
        .eq('nom_profil', data.nom_profil)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      await fetchProfiles()
      return (newProfile as TeacherProfile) ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du profil')
      return null
    }
  }

  const updateProfile = async (id: string, data: Partial<TeacherProfile>): Promise<boolean> => {
    try {
      if (data.is_default) {
        await supabase
          .from('teacher_profiles')
          .update({ is_default: false })
          .eq('is_default', true)
      }

      const { error: supaErr } = await supabase
        .from('teacher_profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (supaErr) throw supaErr
      await fetchProfiles()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil')
      return false
    }
  }

  const deleteProfile = async (id: string): Promise<boolean> => {
    try {
      const { error: supaErr } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', id)

      if (supaErr) throw supaErr
      await fetchProfiles()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du profil')
      return false
    }
  }

  const setDefaultProfile = async (id: string): Promise<boolean> => {
    try {
      // Retire le statut par défaut de tous les profils
      await supabase
        .from('teacher_profiles')
        .update({ is_default: false })
        .neq('id', id)

      // Définit le nouveau profil par défaut
      const { error: supaErr } = await supabase
        .from('teacher_profiles')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (supaErr) throw supaErr
      await fetchProfiles()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la définition du profil par défaut')
      return false
    }
  }

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    refetch: fetchProfiles,
  }
}
