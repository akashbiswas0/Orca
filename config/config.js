module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // RapidAPI Twitter configuration
  rapidApi: {
    key: process.env.RAPIDAPI_KEY,
    host: process.env.RAPIDAPI_HOST || 'twitter241.p.rapidapi.com',
    baseUrl: 'https://twitter241.p.rapidapi.com'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // Request limits
  maxRepliesCount: 100,
  defaultRepliesCount: 40,

  // Body parser limits
  jsonLimit: '10mb',
  
  // CORS settings
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
}; 