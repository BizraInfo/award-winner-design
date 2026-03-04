import { IRule, RuleContext, RuleResult } from '../interfaces';

/**
 * IhsanThresholdRule
 * 
 * Implements BIZRA Rule 0.1.1: No action shall be executed if Ihsan score < 0.99.
 * This rule acts as the VETO LAYER for all client-facing or generative artifacts.
 */
export class IhsanThresholdRule implements IRule {
    public readonly id = 'RULE-0.1.1-IHSAN';
    public readonly name = 'Ihsan Minimum Threshold Constraint';
    private readonly MINIMUM_IHSAN_SCORE = 0.99;

    async evaluate(context: RuleContext): Promise<RuleResult> {
        const eventData = context.event.data;

        // We only evaluate events that carry an ihsanScore property
        if (typeof eventData.ihsanScore === 'undefined') {
            // If it's a critical generative action lacking a score, veto it.
            if (context.event.type === 'contract_generation' || context.event.type === 'agent_inference') {
                return {
                    passed: false,
                    reason: 'Missing required Ihsan score on generative constraint action.',
                    violationType: 'ethic'
                };
            }

            // Non-generative/background telemetry without ihsan scores pass by default
            return { passed: true };
        }

        const score = Number(eventData.ihsanScore);

        if (isNaN(score)) {
            return {
                passed: false,
                reason: 'Invalid Ihsan score format.',
                violationType: 'ethic'
            };
        }

        if (score < this.MINIMUM_IHSAN_SCORE) {
            return {
                passed: false,
                score: score,
                reason: `Ihsan Score (${score}) is below the absolute minimum threshold of ${this.MINIMUM_IHSAN_SCORE}. Action VETOED.`,
                violationType: 'ethic'
            };
        }

        return {
            passed: true,
            score: score
        };
    }
}
