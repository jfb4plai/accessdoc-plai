import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'register' | 'reset'

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  function switchMode(m: Mode) {
    setMode(m); setError(''); setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError('Email ou mot de passe incorrect.')

    } else if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) setError('Compte créé — connectez-vous maintenant.')

    } else {
      // Réinitialisation mot de passe
      const redirectTo = `${window.location.origin}/connexion`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (err) {
        setError(err.message)
      } else {
        setSuccess(`Un lien de réinitialisation a été envoyé à ${email}`)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* En-tête */}
        <div className="text-center mb-8">
          <img src="/plai-logo.jpg" alt="PLAI" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-blue-900">AccessDoc PLAI</h1>
          <p className="text-blue-600 mt-1 text-sm font-medium tracking-wide uppercase">
            Documents accessibles pour tous
          </p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Onglets Connexion / Créer un compte */}
          {mode !== 'reset' && (
            <div className="flex rounded-lg border border-slate-200 mb-6 overflow-hidden">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  mode === 'login' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  mode === 'register' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Créer un compte
              </button>
            </div>
          )}

          {/* Titre mode reset */}
          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Mot de passe oublié</h2>
              <p className="text-sm text-slate-500 mt-1">
                Saisis ton email — tu recevras un lien de réinitialisation.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="prenom.nom@monecole.be"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mot de passe (masqué en mode reset) */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6 caractères minimum"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                               pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                               hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPwd
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Lien mot de passe oublié (mode login uniquement) */}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            {error   && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            {/* Bouton principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-2.5
                         rounded-lg transition disabled:opacity-50"
            >
              {loading ? '…' : mode === 'login' ? 'Se connecter'
                : mode === 'register' ? 'Créer mon compte'
                : 'Envoyer le lien'}
            </button>

            {/* Retour depuis le mode reset */}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition"
              >
                ← Retour à la connexion
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-blue-500 mt-6">
          Pôle Liégeois d'Accompagnement vers une École Inclusive (PLAI)
          <br />Fédération Wallonie-Bruxelles
        </p>
      </div>
    </div>
  )
}
