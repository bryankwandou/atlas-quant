export const ENV = {
    COINGECKO_API_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    // No hardcoded wallet fallback — must be supplied via env (the previous
    // baked-in pubkey was tied to a compromised key and has been removed).
    MASTER_PUBLIC_KEY: process.env.MASTER_PUBLIC_KEY || '',
    CRON_SECRET: process.env.CRON_SECRET || '',
    FEATURE_AI_ENABLED: process.env.FEATURE_AI_ENABLED === 'true',
};
