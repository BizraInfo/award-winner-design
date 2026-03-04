import { describe, it, expect } from 'vitest';
import { IhsanThresholdRule } from './IhsanThresholdRule';
import { RuleContext, TelemetryEvent } from '../interfaces';

const mockEvent = (type: any, data: any): TelemetryEvent => ({
    id: 'test-event-1',
    timestamp: Date.now(),
    source: 'test',
    type: type,
    data: data,
    metadata: { version: '1.0', environment: 'test' }
});

describe('IhsanThresholdRule (Rule 0.1.1)', () => {
    it('passes when Ihsan score is 0.99 (exact threshold)', async () => {
        const rule = new IhsanThresholdRule();
        const context: RuleContext = { event: mockEvent('agent_inference', { ihsanScore: 0.99 }) };
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(true);
        expect(result.score).toBe(0.99);
    });

    it('passes when Ihsan score is 1.0 (above threshold)', async () => {
        const rule = new IhsanThresholdRule();
        const context: RuleContext = { event: mockEvent('agent_inference', { ihsanScore: 1.0 }) };
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(true);
        expect(result.score).toBe(1.0);
    });

    it('fails when Ihsan score is 0.98 (below threshold)', async () => {
        const rule = new IhsanThresholdRule();
        const context: RuleContext = { event: mockEvent('agent_inference', { ihsanScore: 0.98 }) };
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.violationType).toBe('ethic');
        expect(result.reason).toContain('below the absolute minimum threshold');
    });

    it('fails when generative action has missing Ihsan score', async () => {
        const rule = new IhsanThresholdRule();
        const context: RuleContext = { event: mockEvent('contract_generation', {}) };
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.reason).toContain('Missing required Ihsan score');
    });

    it('passes when non-generative action has missing Ihsan score', async () => {
        const rule = new IhsanThresholdRule();
        const context: RuleContext = { event: mockEvent('system_boot', {}) };
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(true);
    });
});
