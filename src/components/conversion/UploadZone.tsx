import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileImage, FileText, File, AlertCircle } from 'lucide-react'

interface UploadZoneProps {
  onFileSelected: (file: File) => void
}

const ACCEPTED_TYPES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
}

const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-500" />
  if (file.type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />
  return <File className="w-8 h-8 text-blue-500" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function UploadZone({ onFileSelected }: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFileSelected(accepted[0])
      }
    },
    [onFileSelected]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject, acceptedFiles, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_SIZE_BYTES,
      multiple: false,
    })

  const hasFile = acceptedFiles.length > 0
  const hasError = fileRejections.length > 0

  // Génère un message d'erreur lisible
  const errorMessage = fileRejections[0]?.errors
    .map(e => {
      if (e.code === 'file-too-large') return `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`
      if (e.code === 'file-invalid-type') return 'Format non accepté'
      return e.message
    })
    .join(', ') ?? null

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive && !isDragReject
            ? 'border-blue-500 bg-blue-50'
            : isDragReject || hasError
            ? 'border-red-400 bg-red-50'
            : hasFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
      >
        <input {...getInputProps()} />

        {hasFile ? (
          /* Fichier sélectionné */
          <div className="flex flex-col items-center gap-2">
            {getFileIcon(acceptedFiles[0])}
            <p className="font-medium text-gray-800 text-sm">{acceptedFiles[0].name}</p>
            <p className="text-xs text-gray-500">{formatSize(acceptedFiles[0].size)}</p>
            <p className="text-xs text-green-600 font-medium mt-1">
              Fichier prêt — cliquez pour en choisir un autre
            </p>
          </div>
        ) : isDragActive && !isDragReject ? (
          /* Survol valide */
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-blue-500 animate-bounce" />
            <p className="text-blue-700 font-medium">Déposez le fichier ici</p>
          </div>
        ) : (
          /* État par défaut */
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-gray-700 font-medium">
                Glissez-déposez votre document ici
              </p>
              <p className="text-gray-400 text-sm mt-1">
                ou <span className="text-blue-600 underline">parcourir les fichiers</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Photo / scan', 'PDF', 'Word (.docx)', 'ODT'].map(fmt => (
                <span
                  key={fmt}
                  className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500"
                >
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">Taille maximale : {MAX_SIZE_MB} Mo</p>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {hasError && errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200
                        rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
    </div>
  )
}
