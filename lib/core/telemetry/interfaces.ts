export type TelemetryEventType =
    | 'system_boot'
    | 'agent_inference'
    | 'contract_generation'
    | 'intent_routing'
    | 'error'
    | 'performance_metric'
    | 'security_event';

export interface TelemetryMetadata {
    readonly version: string;
    readonly environment: string;
    readonly sessionId?: string;
    readonly correlationId?: string;
}

export interface TelemetryEvent {
    readonly id: string;
    readonly timestamp: number;
    readonly source: string;
    readonly type: TelemetryEventType;
    readonly data: Record<string, unknown>;
    readonly metadata: TelemetryMetadata;
}

export interface IDisposable {
    dispose(): void;
}

export interface ITelemetryObserver {
    onTelemetryEvent(event: TelemetryEvent): Promise<void>;
}

export interface TelemetryMetrics {
    totalEventsProcessed: number;
    eventsByType: Record<string, number>;
    lastEventTime: number | null;
}

export interface ITelemetryCollector {
    collect(event: TelemetryEvent): Promise<void>;
    subscribe(observer: ITelemetryObserver): IDisposable;
    getMetrics(): TelemetryMetrics;
}

export interface PluginConfig {
    [key: string]: unknown;
}

export interface ITelemetryPlugin {
    readonly name: string;
    readonly version: string;
    initialize(config: PluginConfig): Promise<void>;
    dispose(): Promise<void>;
}

export interface ICollectorPlugin extends ITelemetryPlugin {
    collect(event: TelemetryEvent): Promise<TelemetryEvent>;
}

export interface IProcessorPlugin extends ITelemetryPlugin {
    process(events: TelemetryEvent[]): Promise<TelemetryEvent[]>;
}

export interface ITransportPlugin extends ITelemetryPlugin {
    transport(events: TelemetryEvent[]): Promise<void>;
}
