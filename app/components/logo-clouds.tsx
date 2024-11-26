export default function LogoClouds() {
  return (
    <div className="mx-auto max-w-5xl bg-white py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-md text-center leading-8 text-slate-600">
          Trusted by employers and writers all-over Kenya
        </h2>
        
        {/* Define gradients that will be reused */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="primary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="secondary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>

        <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          {/* Exceptional Editing Logo - Modern floating design */}
          <div className="col-span-2 flex items-center justify-center lg:col-span-1">
            <svg className="h-16 w-full" viewBox="0 0 158 48">
              <rect x="12" y="8" width="24" height="32" rx="4" fill="#F3F4F6" className="drop-shadow-lg"/>
              <path d="M16 16h16M16 24h16M16 32h12" 
                stroke="url(#primary-gradient)" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <path d="M42 28l-8 8" stroke="url(#secondary-gradient)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M34 36l-2-2 15-15 2 2-15 15z" fill="url(#secondary-gradient)"/>
              <circle cx="47" cy="21" r="3" fill="#EC4899" className="animate-pulse"/>
              <text x="70" y="30" className="fill-gray-600 text-sm font-semibold">Editing</text>
            </svg>
          </div>

          {/* Tested Writers Logo - Certificate with checkmark */}
          <div className="col-span-2 flex items-center justify-center lg:col-span-1">
            <svg className="h-16 w-full" viewBox="0 0 158 48">
              <rect x="12" y="8" width="34" height="32" rx="4" fill="#F3F4F6" className="drop-shadow-lg"/>
              <circle cx="29" cy="24" r="8" fill="url(#primary-gradient)"/>
              <path d="M25 24l3 3 6-6" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path d="M20 34h18" stroke="url(#secondary-gradient)" strokeWidth="2" strokeLinecap="round"/>
              <text x="70" y="30" className="fill-gray-600 text-sm font-semibold">Tested Writers</text>
            </svg>
          </div>

          {/* Money-Back Guarantee Logo - Modern shield */}
          <div className="col-span-2 flex items-center justify-center lg:col-span-1">
            <svg className="h-16 w-full" viewBox="0 0 158 48">
              <path d="M29 8l18 6v12c0 9-8 16-18 16s-18-7-18-16V14l18-6z" 
                fill="url(#accent-gradient)" 
                className="drop-shadow-lg"
              />
              <text textAnchor="middle" x="29" y="30" 
                className="fill-white text-sm font-bold"
              >$</text>
              <circle cx="29" cy="24" r="12" 
                stroke="white" 
                strokeWidth="2" 
                fill="none" 
                opacity="0.2"
              />
              <text x="70" y="30" className="fill-gray-600 text-sm font-semibold">Money-Back</text>
            </svg>
          </div>

          {/* Support Logo - Modern headset */}
          <div className="col-span-2 flex items-center justify-center sm:col-start-2 lg:col-span-1">
            <svg className="h-16 w-full" viewBox="0 0 158 48">
              <circle cx="29" cy="24" r="16" fill="url(#primary-gradient)" className="drop-shadow-lg"/>
              <path d="M18 24a4 4 0 014-4h14a4 4 0 014 4v8a4 4 0 01-4 4h-2v-8h2v-4H22v4h2v8h-2a4 4 0 01-4-4v-8z" 
                fill="white"
              />
              <circle cx="29" cy="28" r="2" fill="#4F46E5"/>
              <text x="70" y="30" className="fill-gray-600 text-sm font-semibold">Support</text>
            </svg>
          </div>

          {/* Assurance Logo - Shield with checkmark */}
          <div className="col-span-2 col-start-2 flex items-center justify-center sm:col-start-auto lg:col-span-1">
            <svg className="h-16 w-full" viewBox="0 0 158 48">
              <path d="M29 8l18 6v12c0 9-8 16-18 16s-18-7-18-16V14l18-6z" 
                fill="url(#secondary-gradient)" 
                className="drop-shadow-lg"
              />
              <path d="M20 24l6 6 12-12" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <text x="70" y="30" className="fill-gray-600 text-sm font-semibold">Assurance</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}