export default function BodyGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={`body-glyph ${className}`} viewBox="0 0 300 440" aria-hidden="true">
      <defs>
        <linearGradient id="glyph-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9a86a" stopOpacity=".55" />
          <stop offset=".48" stopColor="#e9e3d6" stopOpacity=".28" />
          <stop offset="1" stopColor="#4fb3a9" stopOpacity=".46" />
        </linearGradient>
        <radialGradient id="glyph-organ" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#4fb3a9" stopOpacity=".30" />
          <stop offset="1" stopColor="#4fb3a9" stopOpacity=".02" />
        </radialGradient>
        <radialGradient id="glyph-heart" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#c8472f" stopOpacity=".65" />
          <stop offset="1" stopColor="#c8472f" stopOpacity=".04" />
        </radialGradient>
        <filter id="glyph-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g fill="none" stroke="#c9a86a" strokeOpacity=".13">
        <ellipse cx="150" cy="220" rx="124" ry="176" strokeDasharray="2 9" />
        <ellipse cx="150" cy="220" rx="104" ry="154" strokeDasharray="1 12" stroke="#4fb3a9" />
      </g>

      <g fill="rgba(255,255,255,.015)" stroke="url(#glyph-body)" strokeWidth="1.1">
        <circle cx="150" cy="54" r="28" />
        <path d="M139 81 L139 100 C121 105 108 113 101 127 L79 204 C75 220 87 226 94 212 L115 151 L115 215 C116 245 123 263 126 279 L119 402 C118 410 131 412 134 403 L151 291 L169 403 C172 412 185 410 184 402 L177 279 C180 263 187 245 188 215 L188 151 L209 212 C216 226 228 220 224 204 L202 127 C195 113 182 105 164 100 L164 81 Z" />
        <path d="M115 215 C121 245 119 274 125 303 M188 215 C182 245 184 274 178 303" fill="none" strokeOpacity=".25" />
      </g>

      <g filter="url(#glyph-glow)">
        <path d="M150 118 C141 119 135 127 135 137 C135 148 141 154 150 154 C159 154 165 148 165 137 C165 127 159 119 150 118 Z" fill="url(#glyph-heart)" stroke="#c8472f" strokeOpacity=".4" strokeWidth=".6" />
        <path d="M127 126 C116 128 110 138 112 151 C113 160 121 163 129 158 L133 141 Z" fill="url(#glyph-organ)" stroke="#4fb3a9" strokeOpacity=".32" strokeWidth=".6" />
        <path d="M173 126 C184 128 190 138 188 151 C187 160 179 163 171 158 L167 141 Z" fill="url(#glyph-organ)" stroke="#4fb3a9" strokeOpacity=".32" strokeWidth=".6" />
        <path d="M162 172 C172 168 182 174 182 184 C182 195 172 200 162 196 C153 192 152 178 162 172 Z" fill="#b6784f" fillOpacity=".22" stroke="#c9a86a" strokeOpacity=".32" strokeWidth=".6" />
        <path d="M135 175 C127 172 120 180 122 191 C124 202 133 207 141 201 C147 196 146 182 135 175 Z" fill="#8c9f6a" fillOpacity=".18" stroke="#8c9f6a" strokeOpacity=".35" strokeWidth=".6" />
        <path d="M139 213 C133 214 129 223 132 233 C135 243 143 245 149 238 C155 231 153 220 146 215 Z" fill="#c9a86a" fillOpacity=".14" stroke="#c9a86a" strokeOpacity=".28" strokeWidth=".6" />
        <path d="M161 213 C167 214 171 223 168 233 C165 243 157 245 151 238 C145 231 147 220 154 215 Z" fill="#c9a86a" fillOpacity=".14" stroke="#c9a86a" strokeOpacity=".28" strokeWidth=".6" />
      </g>

      <path d="M150 88 L150 152 L144 176 L150 214 L146 252 L150 292" fill="none" stroke="#c9a86a" strokeWidth="1.2" strokeDasharray="3 7" filter="url(#glyph-glow)" opacity=".8" />
      <g fill="#e2c894" filter="url(#glyph-glow)">
        <circle cx="150" cy="145" r="2" />
        <circle cx="150" cy="190" r="1.8" />
        <circle cx="150" cy="232" r="1.6" />
        <circle cx="150" cy="276" r="1.4" />
      </g>

      <g stroke="#4fb3a9" strokeOpacity=".26">
        <line x1="94" y1="72" x2="206" y2="72" />
        <line x1="102" y1="78" x2="198" y2="78" strokeOpacity=".08" strokeWidth="4" />
      </g>

      <g fill="#c9a86a" fontFamily="serif" fontSize="8" opacity=".75">
        <text x="202" y="158">心</text>
        <text x="72" y="192">脾</text>
        <text x="202" y="198">肝</text>
        <text x="202" y="242">肾</text>
      </g>
    </svg>
  );
}
