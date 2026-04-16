import type { TrainingModule, ModuleId } from '~/types/module';
import { placeholderModule } from './placeholder/placeholder-module';

const registry = new Map<ModuleId, TrainingModule>();
registry.set(placeholderModule.id, placeholderModule);

export function registerModule(m: TrainingModule) { registry.set(m.id, m); }
export function getModule(id: ModuleId): TrainingModule | undefined { return registry.get(id); }
export function listModules(): TrainingModule[] { return Array.from(registry.values()); }
