import { IPolicyEngine, IPolicy, PolicyResult, TelemetryEvent, PolicyViolation } from './interfaces';

export class PolicyEngine implements IPolicyEngine {
    private readonly policies = new Map<string, IPolicy>();

    public addPolicy(policy: IPolicy): void {
        this.policies.set(policy.id, policy);
    }

    public removePolicy(policyId: string): void {
        this.policies.delete(policyId);
    }

    public async evaluate(event: TelemetryEvent): Promise<PolicyResult> {
        const violations: PolicyViolation[] = [];

        // Filter policies that apply to this event
        const applicablePolicies = Array.from(this.policies.values()).filter((policy) =>
            policy.isApplicable(event)
        );

        // Evaluate rules within applicable policies
        for (const policy of applicablePolicies) {
            for (const rule of policy.rules) {
                try {
                    // Context can be enriched here over time with system state or history
                    const ruleResult = await rule.evaluate({ event });

                    if (!ruleResult.passed) {
                        // Find the primary VETO or ALERT action mapped for this policy
                        const action = policy.actions.find(a => a.type === 'VETO') || policy.actions[0];

                        violations.push({
                            policyId: policy.id,
                            eventId: event.id,
                            requiredAction: action?.type || 'LOG',
                            details: ruleResult,
                        });
                    }
                } catch (error) {
                    console.error(`Rule ${rule.id} failed to evaluate:`, error);
                    // In zero-trust contexts we may want to fail closed (Veto on error).
                    violations.push({
                        policyId: policy.id,
                        eventId: event.id,
                        requiredAction: 'VETO',
                        details: { passed: false, reason: `Rule Evaluation Error: ${error}` }
                    });
                }
            }
        }

        return {
            passed: violations.length === 0,
            violations,
        };
    }
}
