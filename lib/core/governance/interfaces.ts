import { TelemetryEvent } from '../telemetry/interfaces';

export interface SystemState {
    readonly isEmergencyMode: boolean;
    readonly currentLoad: number;
    readonly activeAgents: number;
}

export interface HistoricalData {
    // Defines historical context for rules
    get(key: string): unknown;
}

export interface RuleContext {
    readonly event: TelemetryEvent;
    readonly systemState?: SystemState;
    readonly historicalData?: HistoricalData;
}

export interface RuleResult {
    passed: boolean;
    score?: number;
    reason?: string;
    violationType?: 'ethic' | 'security' | 'performance' | 'system';
}

export interface IRule {
    readonly id: string;
    readonly name: string;
    evaluate(context: RuleContext): Promise<RuleResult>;
}

export interface PolicyCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
    value?: any;
}

export interface PolicyViolation {
    policyId: string;
    eventId: string;
    requiredAction: string;
    details: RuleResult;
}

export interface PolicyAction {
    type: 'VETO' | 'ALERT' | 'LOG' | 'REMEDIATE';
    remediationId?: string;
}

export interface IPolicy {
    readonly id: string;
    readonly name: string;
    readonly conditions: PolicyCondition[];
    readonly actions: PolicyAction[];

    // Specific rules this policy enforces
    readonly rules: IRule[];

    isApplicable(event: TelemetryEvent): boolean;
}

export interface PolicyResult {
    passed: boolean;
    violations: PolicyViolation[];
}

export interface IPolicyEngine {
    evaluate(event: TelemetryEvent): Promise<PolicyResult>;
    addPolicy(policy: IPolicy): void;
    removePolicy(policyId: string): void;
}
