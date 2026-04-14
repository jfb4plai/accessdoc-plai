import type { FidelityReport as FidelityReportType } from '../../types'
import {
  CheckCircle, XCircle, AlertTriangle, Lightbulb,
  Image, FileCheck
} from 'lucide-react'

interface FidelityReportProps {
  report: FidelityReportType
}

export default function FidelityReport({ report }: FidelityReportProps) {
  const { score_global, aus_appliques, images, alertes_ocr, alertes_pedagogiques, suggestions } = report

  // Couleur du score global
  const scoreColor =
    score_global >= 80 ? 'text-green-700' :
    score_global >= 60 ? 'text-orange-700' :
    'text-red-700'

  const barColor =
    score_global >= 80 ? 'bg-green-500' :
    score_global >= 60 ? 'bg-orange-500' :
    'bg-red-500'

  const appliquesCount  = aus_appliques.filter(a => a.applique).length
  const totalCount      = aus_appliques.length

  return (
    <div className="space-y-5">
      {/* Score global */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Score de fidélité globale
          </h3>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score_global}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${score_global}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {appliquesCount} / {totalCount} aménagements universels appliqués
        </p>
      </div>

      {/* Liste des AU */}
      {aus_appliques.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">Aménagements universels</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {aus_appliques.map(au => (
              <div key={au.id} className="flex items-start gap-3 px-5 py-3">
                {au.applique
                  ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  : <XCircle    className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${au.applique ? 'text-gray-800' : 'text-gray-500'}`}>
                    {au.libelle}
                  </p>
                  {au.note && (
                    <p className="text-xs text-gray-400 mt-0.5">{au.note}</p>
                  )}
                </div>
                <span className={`text-xs font-medium flex-shrink-0
                                  ${au.applique ? 'text-green-600' : 'text-gray-400'}`}>
                  {au.applique ? 'Appliqué' : 'Non appliqué'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résumé des images */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-blue-600" />
          Images traitées
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: images.total,      color: 'bg-gray-100 text-gray-700' },
            { label: 'Arasaac',     value: images.arasaac,    color: 'bg-purple-100 text-purple-700' },
            { label: 'Conservées',  value: images.conservees, color: 'bg-green-100 text-green-700' },
            { label: 'Supprimées',  value: images.supprimees, color: 'bg-red-100 text-red-700' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-lg p-3 text-center ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes OCR */}
      {alertes_ocr.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Alertes OCR ({alertes_ocr.length})
          </h4>
          <ul className="space-y-2">
            {alertes_ocr.map((alerte, i) => (
              <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                <span className="font-bold mt-0.5">·</span>
                {alerte}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alertes pédagogiques */}
      {alertes_pedagogiques.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Alertes pédagogiques ({alertes_pedagogiques.length})
          </h4>
          <ul className="space-y-2">
            {alertes_pedagogiques.map((alerte, i) => (
              <li key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                <span className="font-bold mt-0.5">·</span>
                {alerte}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4" />
            Suggestions ({suggestions.length})
          </h4>
          <ul className="space-y-2">
            {suggestions.map((sug, i) => (
              <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="font-bold mt-0.5">·</span>
                {sug}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
