import { AlertTriangle, CheckCircle, Camera, RefreshCw, ArrowRight } from 'lucide-react'

interface OCRQualityCheckProps {
  score: number           // 0–100
  zones?: string[]        // zones problématiques identifiées
  onContinue: () => void
  onRetry: () => void
}

const SCAN_TIPS = [
  'Posez le document à plat sur une surface stable',
  'Éclairez le document uniformément (évitez les ombres)',
  'Tenez votre téléphone parallèle au document',
  'Cadrez le document entier dans le viseur',
  'Utilisez le mode document de l\'application appareil photo',
  'Évitez le zoom numérique — approchez-vous physiquement',
]

export default function OCRQualityCheck({
  score,
  zones = [],
  onContinue,
  onRetry,
}: OCRQualityCheckProps) {
  const isLow = score < 80
  const isBlocking = score < 50

  // Couleur de la barre de score
  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-orange-500' : 'bg-red-500'
  const scoreColor = score >= 80 ? 'text-green-700' : score >= 60 ? 'text-orange-700' : 'text-red-700'

  return (
    <div className="space-y-6">
      {/* Score global */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Qualité de l'OCR</h3>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <p className="text-sm text-gray-500">
          {score >= 80
            ? 'Qualité suffisante pour une conversion fiable.'
            : score >= 60
            ? 'Qualité moyenne — des erreurs de reconnaissance sont possibles.'
            : 'Qualité insuffisante — le document risque de contenir de nombreuses erreurs.'
          }
        </p>
      </div>

      {/* Zones problématiques */}
      {zones.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-orange-800">
              Zones à faible confiance ({zones.length})
            </h4>
          </div>
          <ul className="space-y-1">
            {zones.map((zone, i) => (
              <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                <span className="text-orange-400 font-bold mt-0.5">·</span>
                {zone}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conseils de scan si score bas */}
      {isLow && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-blue-700" />
            <h4 className="text-sm font-semibold text-blue-800">
              Reprendre le scan — conseils
            </h4>
          </div>
          <ul className="space-y-2">
            {SCAN_TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300
                     rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Charger un autre fichier
        </button>

        {!isBlocking && (
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-800 hover:bg-blue-900
                       text-white text-sm font-medium rounded-lg transition"
          >
            Continuer quand même
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {isBlocking && (
        <p className="text-sm text-red-600">
          La qualité est trop faible pour continuer. Veuillez reprendre le scan.
        </p>
      )}
    </div>
  )
}
