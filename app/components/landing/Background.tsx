export default function Background() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Gradient Background - Force light colors regardless of theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-stone-50 to-amber-50/30" />
      
      {/* Geometric Patterns - Updated to match theme */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-slate-200/40 to-stone-200/40 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-r from-amber-200/30 to-yellow-200/30 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-slate-300/20 to-stone-300/20 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(30,41,59,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,41,59,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
    </div>
  )
}
  