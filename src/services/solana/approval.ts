import { solanaConnection, getMasterPublicKey } from './client';
import { PublicKey } from '@solana/web3.js';
import { logger } from '@/utils/logger';

/**
 * Checks if a user is approved by the master account.
 * Expected logic: Master sends a transaction with a memo "ATLAS_QUANT_APPROVED" to the user.
 */
export const isUserApproved = async (userPubkeyString: string): Promise<boolean> => {
    try {
        const masterPubkey = getMasterPublicKey();
        if (!masterPubkey) {
            // No master account configured → on-chain approval not available.
            // Caller should only reach this branch in 'approval' signup mode,
            // which means we deny by default until admin opens signup or
            // configures MASTER_PUBLIC_KEY.
            return false;
        }
        if (userPubkeyString === masterPubkey.toBase58()) {
            return true; // Master is always approved by design
        }

        const userPubkey = new PublicKey(userPubkeyString);

        // We only fetch recent signatures for brevity/speed on Serverless, usually the approval is recent
        // In a prod env with heavy traffic, we might use a PDA. 
        // The constraints explicitly allowed checking via Devnet cleanly.
        const signatures = await solanaConnection.getSignaturesForAddress(userPubkey, { limit: 50 });

        for (const sigInfo of signatures) {
            if (sigInfo.err) continue; // Ignore failed transactions

            const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
            if (!tx || !tx.transaction.message) continue;

            // Check if Master was the signer of this particular transaction entering the user's history
            const masterSigner = tx.transaction.message.accountKeys.find(
                (key) => key.pubkey.toBase58() === masterPubkey.toBase58() && key.signer
            );

            if (masterSigner) {
                // Look for the SPL memo instruction
                const memoIx = tx.transaction.message.instructions.find(
                    (ix) => 'program' in ix && ix.program === 'spl-memo'
                );

                if (memoIx && 'parsed' in memoIx && memoIx.parsed === 'ATLAS_QUANT_APPROVED') {
                    return true; // Approval found
                }
            }
        }

        return false;
    } catch (error) {
        logger.error(`Approval check failed for ${userPubkeyString}`, error);
        return false; // Fail closed
    }
};
