import { render } from 'solid-js/web';
import { App } from './App';
// numeric.js uses eval internally and requires `numeric` as a runtime global
// @ts-expect-error - numeric has no types
import numericLib from 'numeric';
(globalThis as any).numeric = numericLib;

render(() => <App />, document.getElementById('root')!);
