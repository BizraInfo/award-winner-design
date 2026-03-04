import { TelemetryInfrastructure } from './telemetry/TelemetryInfrastructure';
import { PolicyEngine } from './governance/PolicyEngine';
import { IhsanThresholdRule } from './governance/rules/IhsanThresholdRule';
import { IPolicy, TelemetryEvent } from './governance/interfaces';

/**
 * SystemBootstrap
 * 
 * Initializes the Telemetry Foundation and Governance Core
 * Configures the primary constitutional ruleset (Rule 0.1.1)
 */
export class SystemBootstrap {
    private static instance: SystemBootstrap;
    public readonly telemetry: TelemetryInfrastructure;
    public readonly policyEngine: PolicyEngine;

    private constructor() {
        this.telemetry = new TelemetryInfrastructure();
        this.policyEngine = new PolicyEngine();
        this.initializeConstitutionalPolicies();
        this.bindTelemetryToGovernance();
    }

    public static getInstance(): SystemBootstrap {
        if (!SystemBootstrap.instance) {
            SystemBootstrap.instance = new SystemBootstrap();
        }
        return SystemBootstrap.instance;
    }

    private initializeConstitutionalPolicies() {
        // Create the core Constitutional Policy wrapping the Ihsan Rule
        const ihsanRule = new IhsanThresholdRule();

        const coreConstitutionalPolicy: IPolicy = {
            id: 'POLICY-CONSTITUTIONAL-01',
            name: 'BIZRA Immutable Constitutional Constraints',

            // This policy applies to all events requiring ethical bounds checking
            isApplicable: (event: TelemetryEvent) => {
                const applicableTypes = ['agent_inference', 'contract_generation', 'intent_routing'];
                return applicableTypes.includes(event.type);
            },

            conditions: [], // Conditions can be expanded for complex multi-rule routing

            // The actions to take on violation
            actions: [
                { type: 'VETO' },
                { type: 'ALERT' } // In production, this would trigger an architect escalation
            ],

            // The specific rules enforced by this policy
            rules: [ihsanRule]
        };

        this.policyEngine.addPolicy(coreConstitutionalPolicy);
    }

    private bindTelemetryToGovernance() {
        // Subscribe the PolicyEngine as an observer to all TelemetryEvents
        this.telemetry.subscribe({
            onTelemetryEvent: async (event: TelemetryEvent) => {
                const result = await this.policyEngine.evaluate(event);

                if (!result.passed) {
                    console.error('/// CONSTITUTIONAL VIOLATION DETECTED & VETOED ///');
                    result.violations.forEach(v => {
                        console.error(`- Policy: ${v.policyId}`);
                        console.error(`- Action Required: ${v.requiredAction}`);
                        console.error(`- Reason: ${v.details.reason}`);
                    });

                    // Here we would typically throw an intercept error to halt execution pipeline
                    // throw new Error('Action VETOED by PolicyEngine');
                } else {
                    // Development mode logging for visibility
                    // console.log(`[GOVERNANACE] Event ${event.id} passed validation.`);
                }
            }
        });
    }
}

// Automatically bootstrap on import for seamless integration
export const bizraCore = SystemBootstrap.getInstance();
