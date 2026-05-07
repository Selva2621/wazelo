import { Injectable, Logger } from '@nestjs/common';
import { AUTOMATION_CONFIG } from '@/common/constants';

interface ExecutionChainEntry {
  ruleId: string;
  contactId: string;
  depth: number;
  timestamp: number;
}

@Injectable()
export class LoopPreventionService {
  private readonly logger = new Logger(LoopPreventionService.name);

  // In-memory tracking for active execution chains
  // Key: `${orgId}:${contactId}` → chain of rule executions
  private readonly activeChains = new Map<string, ExecutionChainEntry[]>();

  // Cleanup stale entries every 5 minutes
  private readonly STALE_THRESHOLD_MS = 300_000;

  canExecute(
    orgId: string,
    ruleId: string,
    contactId: string,
    currentDepth: number,
  ): { allowed: boolean; reason?: string } {
    // Check max loop depth
    if (currentDepth >= AUTOMATION_CONFIG.MAX_LOOP_DEPTH) {
      this.logger.warn(
        `Loop depth limit reached: org=${orgId} rule=${ruleId} contact=${contactId} depth=${currentDepth}`,
      );
      return {
        allowed: false,
        reason: `Max loop depth (${AUTOMATION_CONFIG.MAX_LOOP_DEPTH}) exceeded`,
      };
    }

    const chainKey = `${orgId}:${contactId}`;
    const chain = this.activeChains.get(chainKey) || [];

    // Check if the same rule is already in the chain for this contact
    const duplicateInChain = chain.find(
      (entry) =>
        entry.ruleId === ruleId &&
        Date.now() - entry.timestamp < this.STALE_THRESHOLD_MS,
    );

    if (duplicateInChain) {
      this.logger.warn(
        `Duplicate rule in chain: org=${orgId} rule=${ruleId} contact=${contactId}`,
      );
      return {
        allowed: false,
        reason: `Rule ${ruleId} already executed in this chain for contact ${contactId}`,
      };
    }

    return { allowed: true };
  }

  recordExecution(
    orgId: string,
    ruleId: string,
    contactId: string,
    depth: number,
  ): void {
    const chainKey = `${orgId}:${contactId}`;
    const chain = this.activeChains.get(chainKey) || [];

    chain.push({
      ruleId,
      contactId,
      depth,
      timestamp: Date.now(),
    });

    this.activeChains.set(chainKey, chain);
  }

  clearChain(orgId: string, contactId: string): void {
    const chainKey = `${orgId}:${contactId}`;
    this.activeChains.delete(chainKey);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, chain] of this.activeChains.entries()) {
      const filtered = chain.filter(
        (entry) => now - entry.timestamp < this.STALE_THRESHOLD_MS,
      );
      if (filtered.length === 0) {
        this.activeChains.delete(key);
      } else {
        this.activeChains.set(key, filtered);
      }
    }
  }
}
