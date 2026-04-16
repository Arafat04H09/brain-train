import { describe, it, expectTypeOf } from 'vitest';
import type { TrainingModule, Session, Trial, Response, TrialResult } from '~/types/module';
import type { StimulusDescriptor } from '~/types/stimulus';
import type { DomainState } from '~/types/domain';

describe('module contract types', () => {
  it('TrainingModule has required shape', () => {
    expectTypeOf<TrainingModule>().toHaveProperty('id');
    expectTypeOf<TrainingModule>().toHaveProperty('displayName');
    expectTypeOf<TrainingModule>().toHaveProperty('createSession');
  });

  it('Trial references StimulusDescriptor', () => {
    expectTypeOf<Trial>().toHaveProperty('stimulus').toEqualTypeOf<StimulusDescriptor>();
  });

  it('createSession accepts DomainState', () => {
    type Fn = TrainingModule['createSession'];
    expectTypeOf<Parameters<Fn>[0]>().toEqualTypeOf<DomainState>();
  });
});
