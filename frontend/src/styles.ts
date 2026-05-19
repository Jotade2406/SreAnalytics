import { CSSProperties } from 'react'
export const S = {
  card: { background:'rgba(15,23,42,0.7)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px', transition:'all 0.3s ease' } as CSSProperties,
  grad: { background:'linear-gradient(135deg,#6366f1,#3b82f6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontWeight:900 } as CSSProperties,
  formula: { background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'12px', padding:'14px 24px', fontFamily:"'Courier New',monospace", fontSize:'1.05rem', color:'#a5b4fc', textAlign:'center' as const, letterSpacing:'0.05em', marginBottom:'24px' } as CSSProperties,
  topbar: { position:'sticky' as const, top:0, zIndex:100, background:'rgba(2,8,23,0.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(99,102,241,0.15)', height:'64px', padding:'0 32px', display:'flex', justifyContent:'space-between', alignItems:'center' } as CSSProperties,
  pill: (active:boolean): CSSProperties => ({ padding:'8px 20px', borderRadius:'9999px', fontSize:'14px', fontWeight:600, cursor:'pointer', border: active ? 'none' : '1px solid rgba(255,255,255,0.1)', background: active ? 'linear-gradient(135deg,#6366f1,#3b82f6)' : 'transparent', color: active ? '#fff' : '#94a3b8', boxShadow: active ? '0 4px 15px rgba(99,102,241,0.4)' : 'none', transition:'all 0.2s' }),
  badge: (c:string): CSSProperties => ({ display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px', borderRadius:'9999px', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:`${c}22`, border:`1px solid ${c}55`, color:c }),
  stat: { background:'rgba(15,23,42,0.5)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'12px', padding:'20px' } as CSSProperties,
  orb: (w:number,bg:string,t:string,l:string,delay:number): CSSProperties => ({ position:'fixed', width:w, height:w, borderRadius:'50%', background:bg, filter:'blur(80px)', opacity:0.12, pointerEvents:'none', zIndex:0, top:t, left:l, animation:`float 8s ease-in-out ${delay}s infinite` }),
  ttip: { background:'#0f172a', border:'1px solid #334155', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#f8fafc' } as CSSProperties,
}
export const chartAxis = { stroke:'#334155', tick:{ fill:'#64748b', fontSize:11 }, tickLine:false, axisLine:false }
export const chartGrid = { stroke:'#1e293b', strokeDasharray:'3 3', vertical:false }
