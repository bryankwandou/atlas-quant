import { solanaConnection, getMasterPublicKey } from './client';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';

export const hasMinimumBalance = async (pubkeyString: string): Promise<boolean> => {
    try {
        const master = getMasterPublicKey();
        if (master && pubkeyString === master.toBase58()) return true;
        const pubkey = new PublicKey(pubkeyString);
        const balance = await solanaConnection.getBalance(pubkey);
        return balance >= (CONSTANTS.MIN_BALANCE_SOL * LAMPORTS_PER_SOL);
    } catch (error) {
        logger.error(`Balance check failed for ${pubkeyString}`, error);
        return false; // Fail closed on error, preserving strict security
    }
};
