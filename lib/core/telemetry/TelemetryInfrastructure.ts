import {
    ITelemetryCollector,
    TelemetryEvent,
    ITelemetryObserver,
    IDisposable,
    TelemetryMetrics,
    ICollectorPlugin,
    IProcessorPlugin,
    ITransportPlugin,
} from './interfaces';

export class TelemetryInfrastructure implements ITelemetryCollector {
    private readonly observers = new Set<ITelemetryObserver>();
    private metrics: TelemetryMetrics = {
        totalEventsProcessed: 0,
        eventsByType: {},
        lastEventTime: null,
    };

    constructor(
        private readonly collectorPlugins: ICollectorPlugin[] = [],
        private readonly processorPlugins: IProcessorPlugin[] = [],
        private readonly transportPlugins: ITransportPlugin[] = []
    ) { }

    public async collect(event: TelemetryEvent): Promise<void> {
        try {
            // 1. Apply collector plugins (e.g., enrichment)
            let processedEvent = event;
            for (const plugin of this.collectorPlugins) {
                processedEvent = await plugin.collect(processedEvent);
            }

            // 2. Notify observers synchronously or asynchronously based on implementation choice
            // Assuming asynchronous independent notification for safety and performance
            await this.notifyObservers(processedEvent);

            // 3. Apply processor plugins (e.g., buffering, batching, filtering)
            const processedEvents = await this.applyProcessorPlugins([processedEvent]);

            // 4. Apply transport plugins (e.g., to ELK stack, Grafana Loki, or database)
            if (processedEvents.length > 0) {
                await this.applyTransportPlugins(processedEvents);
            }

            this.updateMetrics(processedEvent);

        } catch (error) {
            console.error('TelemetryInfrastructure Critical Error:', error);
            // In a production system, this catch block is critical.
            // We do NOT want telemetry failures to crash the main BIZRA application.
        }
    }

    public subscribe(observer: ITelemetryObserver): IDisposable {
        this.observers.add(observer);
        return {
            dispose: () => {
                this.observers.delete(observer);
            },
        };
    }

    public getMetrics(): TelemetryMetrics {
        return { ...this.metrics }; // Return a copy to prevent mutation
    }

    private async notifyObservers(event: TelemetryEvent): Promise<void> {
        const notifications = Array.from(this.observers).map((observer) =>
            observer.onTelemetryEvent(event).catch((err) => {
                // Observers failing should not stop other observers
                console.error('Observer failure on TelemetryEvent:', err);
            })
        );
        await Promise.all(notifications);
    }

    private async applyProcessorPlugins(events: TelemetryEvent[]): Promise<TelemetryEvent[]> {
        let currentEvents = [...events];
        for (const plugin of this.processorPlugins) {
            currentEvents = await plugin.process(currentEvents);
            if (currentEvents.length === 0) break; // Optimization: stop processing if a filter removes all events
        }
        return currentEvents;
    }

    private async applyTransportPlugins(events: TelemetryEvent[]): Promise<void> {
        const transports = this.transportPlugins.map(plugin =>
            plugin.transport(events).catch(err => {
                console.error(`Transport plugin ${plugin.name} failed:`, err);
            })
        );
        await Promise.all(transports);
    }

    private updateMetrics(event: TelemetryEvent): void {
        this.metrics.totalEventsProcessed += 1;
        this.metrics.lastEventTime = Date.now();

        if (this.metrics.eventsByType[event.type]) {
            this.metrics.eventsByType[event.type] += 1;
        } else {
            this.metrics.eventsByType[event.type] = 1;
        }
    }
}
