import type { ProcessingStep } from '../../types'
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, Clock
} from 'lucide-react'

interface ProcessingPipelineProps {
  steps: ProcessingStep[]
}

function StepIcon({ status }: { status: ProcessingStep['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
    default:
      return <Clock className="w-5 h-5 text-gray-300 flex-shrink-0" />
  }
}

function stepRowClass(status: ProcessingStep['status']): string {
  switch (status) {
    case 'done':    return 'border-green-100 bg-green-50'
    case 'error':   return 'border-red-100 bg-red-50'
    case 'warning': return 'border-orange-100 bg-orange-50'
    case 'running': return 'border-blue-100 bg-blue-50'
    default:        return 'border-gray-100 bg-white'
  }
}

function labelClass(status: ProcessingStep['status']): string {
  switch (status) {
    case 'done':    return 'text-green-800'
    case 'error':   return 'text-red-800'
    case 'warning': return 'text-orange-800'
    case 'running': return 'text-blue-800 font-semibold'
    default:        return 'text-gray-400'
  }
}

function detailClass(status: ProcessingStep['status']): string {
  switch (status) {
    case 'done':    return 'text-green-600'
    case 'error':   return 'text-red-600'
    case 'warning': return 'text-orange-600'
    case 'running': return 'text-blue-600'
    default:        return 'text-gray-400'
  }
}

export default function ProcessingPipeline({ steps }: ProcessingPipelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`flex items-start gap-3 p-4 rounded-lg border transition
                      ${stepRowClass(step.status)}`}
        >
          {/* Numéro + icône */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-gray-400 w-4 text-right">
              {index + 1}
            </span>
            <StepIcon status={step.status} />
          </div>

          {/* Label + détail */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${labelClass(step.status)}`}>
              {step.label}
            </p>
            {step.detail && (
              <p className={`text-xs mt-0.5 ${detailClass(step.status)}`}>
                {step.detail}
              </p>
            )}
          </div>

          {/* Badge statut */}
          <div className="flex-shrink-0">
            {step.status === 'running' && (
              <span className="text-xs text-blue-600 font-medium">En cours…</span>
            )}
            {step.status === 'warning' && (
              <span className="text-xs text-orange-600 font-medium">Attention</span>
            )}
            {step.status === 'error' && (
              <span className="text-xs text-red-600 font-medium">Erreur</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
