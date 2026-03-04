# ADR 002: Dual LLM Backend Architecture

## Status

Accepted

## Date

2024-01-15

## Context

BIZRA Node0 Genesis requires flexible LLM integration that supports:
- Local inference for privacy-sensitive workloads
- Multiple model providers and architectures
- Easy model switching without code changes
- Development environment without cloud dependencies

### Options Considered

1. **Single Cloud Provider (OpenAI/Anthropic)**
   - Pros: Simple integration, managed infrastructure
   - Cons: Vendor lock-in, latency, cost, privacy concerns

2. **Ollama Only**
   - Pros: Open-source, local, supports many models
   - Cons: Single point of failure, limited model formats

3. **LM Studio Only**
   - Pros: User-friendly GUI, good model management
   - Cons: Primarily Windows/Mac, manual model downloads

4. **Dual Backend (Ollama + LM Studio)**
   - Pros: Flexibility, redundancy, different model ecosystems
   - Cons: Complexity, dual maintenance

5. **vLLM + TensorRT-LLM**
   - Pros: Production-grade, high throughput
   - Cons: Complex setup, GPU-heavy requirements

## Decision

Implement a **Dual LLM Backend Architecture** with Ollama (primary) and LM Studio (secondary).

### Architecture

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Router  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│Ollama │ │  LM   │
│:11434 │ │Studio │
│       │ │:1234  │
└───────┘ └───────┘
```

### Configuration

```yaml
llm:
  primary:
    provider: ollama
    endpoint: http://localhost:11434
    models:
      - llama2
      - mistral
      - codellama
  secondary:
    provider: lm_studio
    endpoint: http://localhost:1234
    models:
      - any-gguf-model
  routing:
    strategy: primary_with_fallback
    health_check_interval: 30s
    failover_threshold: 3
```

## Consequences

### Positive

- **Flexibility**: Users can choose preferred LLM runtime
- **Redundancy**: Automatic failover if primary backend unavailable
- **Privacy**: All inference runs locally
- **Cost**: No per-token API costs
- **Development**: Works offline, no API keys needed

### Negative

- **Complexity**: Two systems to maintain and monitor
- **Resources**: Requires significant local compute
- **Consistency**: Model behavior may vary between backends

### Implementation Notes

1. Abstract LLM interface in Rust:
```rust
#[async_trait]
pub trait LLMBackend {
    async fn generate(&self, request: GenerateRequest) -> Result<GenerateResponse>;
    async fn stream(&self, request: GenerateRequest) -> Result<impl Stream<Item = Token>>;
    async fn health_check(&self) -> Result<HealthStatus>;
}
```

2. Routing logic handles:
   - Health-based routing
   - Model availability checking
   - Automatic failover
   - Load balancing (future)

## References

- [Ollama GitHub](https://github.com/ollama/ollama)
- [LM Studio](https://lmstudio.ai/)
- [OpenAI Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)
