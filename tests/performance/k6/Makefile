# BIZRA Node0 Genesis - Performance Testing Suite
# Run k6 performance tests in Docker

K6_VERSION=0.47.0
API_URL ?= http://host.docker.internal:8080
OLLAMA_URL ?= http://host.docker.internal:11434
LM_STUDIO_URL ?= http://host.docker.internal:1234

.PHONY: all smoke load stress spike llm-test db-test full-suite clean

# Default: run smoke tests
all: smoke

# Smoke test - Quick validation
smoke:
	@echo "🚀 Running smoke tests..."
	k6 run \
		-e BASE_URL=$(API_URL) \
		--out json=results/smoke-$(shell date +%Y%m%d_%H%M%S).json \
		scenarios/api-load-test.js \
		--tag testType=smoke \
		--config config/smoke.json

# Load test - Steady state performance
load:
	@echo "📈 Running load tests..."
	k6 run \
		-e BASE_URL=$(API_URL) \
		--out json=results/load-$(shell date +%Y%m%d_%H%M%S).json \
		--out influxdb=http://localhost:8086/k6 \
		scenarios/api-load-test.js \
		--tag testType=load

# Stress test - Find breaking point
stress:
	@echo "💪 Running stress tests..."
	k6 run \
		-e BASE_URL=$(API_URL) \
		--out json=results/stress-$(shell date +%Y%m%d_%H%M%S).json \
		scenarios/api-load-test.js \
		--tag testType=stress

# Spike test - Sudden traffic surge
spike:
	@echo "⚡ Running spike tests..."
	k6 run \
		-e BASE_URL=$(API_URL) \
		--out json=results/spike-$(shell date +%Y%m%d_%H%M%S).json \
		scenarios/api-load-test.js \
		--tag testType=spike

# LLM backend performance test
llm-test:
	@echo "🧠 Running LLM performance tests..."
	k6 run \
		-e API_URL=$(API_URL) \
		-e OLLAMA_URL=$(OLLAMA_URL) \
		-e LM_STUDIO_URL=$(LM_STUDIO_URL) \
		--out json=results/llm-$(shell date +%Y%m%d_%H%M%S).json \
		scenarios/llm-performance-test.js

# Database performance test
db-test:
	@echo "💾 Running database performance tests..."
	k6 run \
		-e API_URL=$(API_URL) \
		--out json=results/db-$(shell date +%Y%m%d_%H%M%S).json \
		scenarios/database-performance-test.js

# Full test suite
full-suite: smoke
	@echo "🎯 Running full performance test suite..."
	$(MAKE) load
	$(MAKE) llm-test
	$(MAKE) db-test
	@echo "✅ Full suite completed!"

# Docker-based execution
docker-smoke:
	docker run --rm -i \
		-v $(PWD):/scripts \
		-e BASE_URL=$(API_URL) \
		grafana/k6:$(K6_VERSION) run /scripts/scenarios/api-load-test.js

docker-full:
	docker run --rm -i \
		--add-host=host.docker.internal:host-gateway \
		-v $(PWD):/scripts \
		-v $(PWD)/results:/results \
		-e BASE_URL=$(API_URL) \
		-e OLLAMA_URL=$(OLLAMA_URL) \
		grafana/k6:$(K6_VERSION) run /scripts/scenarios/api-load-test.js

# Generate HTML report
report:
	@echo "📊 Generating performance report..."
	k6 run \
		-e BASE_URL=$(API_URL) \
		--out json=results/report-data.json \
		scenarios/api-load-test.js
	@echo "Report generated in results/"

# Clean up results
clean:
	rm -rf results/*.json results/*.html
	@echo "🧹 Cleaned up results"

# Create results directory
setup:
	mkdir -p results
	@echo "📁 Created results directory"

# Help
help:
	@echo "BIZRA Node0 Genesis - Performance Testing"
	@echo ""
	@echo "Targets:"
	@echo "  smoke       - Quick smoke test (default)"
	@echo "  load        - Load test with steady state"
	@echo "  stress      - Stress test to find limits"
	@echo "  spike       - Spike test for sudden traffic"
	@echo "  llm-test    - LLM backend performance"
	@echo "  db-test     - Database performance"
	@echo "  full-suite  - Run all tests"
	@echo "  report      - Generate HTML report"
	@echo "  clean       - Remove results"
	@echo ""
	@echo "Environment Variables:"
	@echo "  API_URL       - API endpoint (default: $(API_URL))"
	@echo "  OLLAMA_URL    - Ollama endpoint (default: $(OLLAMA_URL))"
	@echo "  LM_STUDIO_URL - LM Studio endpoint (default: $(LM_STUDIO_URL))"
