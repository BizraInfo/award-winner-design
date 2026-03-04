import { create } from 'zustand';

// Types for our AI Models
export type AIProvider = 'lm-studio' | 'ollama' | 'openai';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  capabilities: ('text' | 'vision' | 'code' | 'reasoning')[];
  endpoint: string;
}

// The Registry of Local Models we discovered
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'ministral-14b',
    name: 'Ministral 3 14B Reasoning',
    provider: 'lm-studio',
    contextWindow: 32768,
    capabilities: ['text', 'reasoning'],
    endpoint: 'http://localhost:1234/v1'
  },
  {
    id: 'qwen3-vl',
    name: 'Qwen 3 Vision Language',
    provider: 'lm-studio',
    contextWindow: 16384,
    capabilities: ['text', 'vision'],
    endpoint: 'http://localhost:1234/v1'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'ollama',
    contextWindow: 128000,
    capabilities: ['text', 'code', 'reasoning'],
    endpoint: 'http://localhost:11434/api/chat'
  },
  {
    id: 'bizra-planner',
    name: 'Bizra Planner (Custom)',
    provider: 'ollama',
    contextWindow: 8192,
    capabilities: ['text', 'reasoning'],
    endpoint: 'http://localhost:11434/api/chat'
  }
];

interface AIStore {
  activeModel: AIModel;
  isConnected: boolean;
  setActiveModel: (modelId: string) => void;
  checkConnection: () => Promise<boolean>;
}

export const useAIStore = create<AIStore>((set, get) => ({
  activeModel: AVAILABLE_MODELS[0], // Default to Ministral
  isConnected: false,
  
  setActiveModel: (modelId) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) set({ activeModel: model });
  },

  checkConnection: async () => {
    const { activeModel } = get();
    try {
      // Simple health check ping
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      // Note: Actual endpoint path depends on provider standard (OpenAI compat vs Ollama)
      const healthEndpoint = activeModel.provider === 'ollama' 
        ? activeModel.endpoint.replace('/api/chat', '/api/tags') 
        : activeModel.endpoint + '/models';

      const res = await fetch(healthEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const status = res.ok;
      set({ isConnected: status });
      return status;
    } catch (e) {
      set({ isConnected: false });
      return false;
    }
  }
}));
