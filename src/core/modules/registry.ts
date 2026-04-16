import type { TrainingModule, ModuleId } from '~/types/module';
import { placeholderModule } from './placeholder/placeholder-module';
import { wmModule } from './working-memory/wm-module';
import { ufovModule } from './ufov/ufov-module';
import { efModule } from './compound-ef/ef-module';
import { relationalModule } from './relational/relational-module';
import { calibrationModule } from './calibration/calibration-module';

const registry = new Map<ModuleId, TrainingModule>();
registry.set(placeholderModule.id, placeholderModule);
registry.set(wmModule.id, wmModule);
registry.set(ufovModule.id, ufovModule);
registry.set(efModule.id, efModule);
registry.set(relationalModule.id, relationalModule);
registry.set(calibrationModule.id, calibrationModule);

export function registerModule(m: TrainingModule) { registry.set(m.id, m); }
export function getModule(id: ModuleId): TrainingModule | undefined { return registry.get(id); }
export function listModules(): TrainingModule[] { return Array.from(registry.values()); }
