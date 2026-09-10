import React, { useState } from 'react';
import { X, AlertCircle, ChevronRight, Send } from 'lucide-react';

export interface ClarificationData {
  motivo: string;
  campos_faltantes: string[];
  opciones_rapidas: string[];
  toolCallId?: string;
}

export interface ClarificationSubmitPayload {
  toolCallId: string;
  respuesta: string;
}

interface ClarificationModalProps {
  data: ClarificationData;
  onSubmit: (payload: ClarificationSubmitPayload) => void;
  onClose: () => void;
}

export function ClarificationModal({ data, onSubmit, onClose }: ClarificationModalProps) {
  const [customText, setCustomText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelectOption = (opcion: string) => {
    setSelectedOption(opcion);
    onSubmit({ toolCallId: data.toolCallId || '', respuesta: opcion });
  };

  const handleSendCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onSubmit({ toolCallId: data.toolCallId || '', respuesta: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCustom(); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '520px', borderRadius: '16px',
          border: '1px solid rgba(0,217,255,0.28)',
          background: 'linear-gradient(135deg,#070b12 0%,#0a0f1a 100%)',
          boxShadow: '0 0 60px rgba(0,217,255,0.12),0 20px 60px rgba(0,0,0,0.95)',
          overflow: 'hidden', animation: 'slideUpFade 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(0,217,255,0.15)', background:'rgba(0,217,255,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', backgroundColor:'rgba(0,217,255,0.12)', border:'1px solid rgba(0,217,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(0,217,255,0.25)' }}>
              <AlertCircle size={16} color="#00D9FF" />
            </div>
            <div>
              <div style={{ fontSize:'13px', fontWeight:800, color:'#00D9FF', letterSpacing:'0.3px', lineHeight:1.2 }}>Información requerida para continuar</div>
              <div style={{ fontSize:'9.5px', fontFamily:'monospace', color:'#64748b', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase' }}>// ZENITH · HUMAN-IN-THE-LOOP</div>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Cerrar" style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', padding:'4px', borderRadius:'6px', transition:'color 0.15s ease' }} onMouseEnter={(e)=>{e.currentTarget.style.color='#ffffff'}} onMouseLeave={(e)=>{e.currentTarget.style.color='#64748b'}}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px' }}>
          <p style={{ margin:'0 0 16px 0', fontSize:'13.5px', color:'#cbd5e1', lineHeight:'1.55' }}>{data.motivo}</p>

          {data.campos_faltantes.length > 0 && (
            <div style={{ marginBottom:'18px', padding:'12px 14px', borderRadius:'10px', backgroundColor:'rgba(15,20,35,0.8)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ display:'block', fontSize:'9.5px', fontWeight:800, color:'#00D9FF', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'8px', fontFamily:'monospace' }}>Puntos requeridos:</span>
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:'5px' }}>
                {data.campos_faltantes.map((campo, i) => (
                  <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'7px', fontSize:'12.5px', color:'#94a3b8', lineHeight:'1.45' }}>
                    <ChevronRight size={12} color="#00D9FF" style={{ flexShrink:0, marginTop:'2px' }} />
                    <span>{campo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.opciones_rapidas.length > 0 && (
            <div style={{ marginBottom:'18px' }}>
              <span style={{ display:'block', fontSize:'10px', fontWeight:600, color:'#64748b', marginBottom:'8px', letterSpacing:'0.3px' }}>Respuestas rápidas:</span>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'7px' }}>
                {data.opciones_rapidas.map((opcion, i) => (
                  <button key={i} type="button" onClick={() => handleSelectOption(opcion)}
                    style={{ padding:'8px 12px', borderRadius:'8px', border: selectedOption === opcion ? '1px solid rgba(0,217,255,0.55)' : '1px solid rgba(255,255,255,0.08)', backgroundColor: selectedOption === opcion ? 'rgba(0,217,255,0.1)' : 'rgba(255,255,255,0.03)', color: selectedOption === opcion ? '#00D9FF' : '#cbd5e1', fontSize:'12px', textAlign:'left', cursor:'pointer', transition:'all 0.15s ease', lineHeight:'1.4' }}
                    onMouseEnter={(e)=>{ if(selectedOption!==opcion){e.currentTarget.style.borderColor='rgba(0,217,255,0.35)';e.currentTarget.style.backgroundColor='rgba(0,217,255,0.06)'}}}
                    onMouseLeave={(e)=>{ if(selectedOption!==opcion){e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.backgroundColor='rgba(255,255,255,0.03)'}}}
                  >{opcion}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <span style={{ fontSize:'10px', fontWeight:600, color:'#64748b', letterSpacing:'0.3px' }}>O escribe tus detalles:</span>
            <textarea rows={3} value={customText} onChange={(e) => setCustomText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ingresa especificaciones concretas... (Enter para enviar)"
              style={{ width:'100%', padding:'10px 13px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', backgroundColor:'rgba(10,15,28,0.9)', color:'#f1f5f9', fontSize:'13px', lineHeight:'1.5', resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s ease' }}
              onFocus={(e)=>{e.currentTarget.style.borderColor='rgba(0,217,255,0.4)'}}
              onBlur={(e)=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}
            />
            <button type="button" onClick={handleSendCustom} disabled={!customText.trim()}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', padding:'10px 20px', borderRadius:'8px', border:'none', backgroundColor: customText.trim() ? 'rgba(0,217,255,0.88)' : 'rgba(255,255,255,0.06)', color: customText.trim() ? '#000000' : '#52525b', fontSize:'12.5px', fontWeight:700, cursor: customText.trim() ? 'pointer' : 'not-allowed', transition:'all 0.2s ease', boxShadow: customText.trim() ? '0 0 20px rgba(0,217,255,0.3)' : 'none' }}
              onMouseEnter={(e)=>{ if(customText.trim()){e.currentTarget.style.backgroundColor='rgba(0,217,255,1)';e.currentTarget.style.boxShadow='0 0 28px rgba(0,217,255,0.5)'}}}
              onMouseLeave={(e)=>{ if(customText.trim()){e.currentTarget.style.backgroundColor='rgba(0,217,255,0.88)';e.currentTarget.style.boxShadow='0 0 20px rgba(0,217,255,0.3)'}}}
            >
              <Send size={13} />
              <span>Enviar aclaración y procesar</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
