import React from 'react';
import { X, ExternalLink, ShieldCheck, KeyRound, CheckCircle2, User, Users } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121A2A] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl shadow-blue-950/60 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Guía de Configuración Roblox Open Cloud</h2>
            <p className="text-xs text-slate-400">Cómo obtener tu API Key y configurar tu User/Group ID</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Step 1 */}
          <div className="bg-[#0A0E17] border border-slate-800 p-4 rounded-xl">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px]">1</span>
              <span>Accede al Roblox Creator Hub</span>
            </h4>
            <p className="text-slate-400 mb-2">
              Ingresa al panel de credenciales Open Cloud de Roblox:
            </p>
            <a
              href="https://create.roblox.com/dashboard/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 hover:text-white rounded-lg border border-blue-500/30 font-medium transition-colors"
            >
              <span>Abrir create.roblox.com/credentials</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0A0E17] border border-slate-800 p-4 rounded-xl">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px]">2</span>
              <span>Crea una nueva API Key</span>
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400">
              <li>Haz clic en <strong className="text-white">Create API Key</strong>.</li>
              <li>Asigna un nombre descriptivo (ejemplo: <code className="text-blue-300">MAYKEL Audio Key</code>).</li>
              <li>
                En la sección <strong className="text-white">Access Permissions</strong>, agrega la API:
                <div className="mt-1.5 ml-4 p-2 bg-blue-950/40 border border-blue-900/50 rounded-lg text-slate-200">
                  API: <strong className="text-cyan-400">Assets API</strong> → Operaciones: <strong className="text-emerald-400">Read & Write</strong>
                </div>
              </li>
              <li>En <strong className="text-white">IP Restrictions</strong>, selecciona <code>No IP restrictions</code> (o agrega las IPs de tu servidor).</li>
              <li>Genera y copia la clave.</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0A0E17] border border-slate-800 p-4 rounded-xl">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px]">3</span>
              <span>Obtén tu User ID o Group ID</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5 mb-1">
                  <User className="w-4 h-4" /> Para Creador "User":
                </span>
                <p className="text-slate-400">
                  Abre tu perfil de Roblox en el navegador:
                  <code className="block mt-1 p-1 bg-slate-950 rounded text-slate-300 break-all">
                    roblox.com/users/<strong className="text-amber-400">123456789</strong>/profile
                  </code>
                </p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5 mb-1">
                  <Users className="w-4 h-4" /> Para Creador "Group":
                </span>
                <p className="text-slate-400">
                  Abre la página del grupo de Roblox:
                  <code className="block mt-1 p-1 bg-slate-950 rounded text-slate-300 break-all">
                    roblox.com/groups/<strong className="text-amber-400">987654321</strong>/...
                  </code>
                </p>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              <strong className="text-emerald-300">Seguridad Total:</strong> Tu Roblox API Key nunca se guarda en el navegador ni en almacenamiento local (localStorage). Se procesa directamente en el servidor seguro de MAYKEL exclusivamente para la solicitud de creación de activos de Open Cloud.
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
