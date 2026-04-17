import { Router, Route } from '@solidjs/router';
import { Home } from './pages/home';
import { Today } from './pages/today';
import { SessionRunner } from './pages/session-runner';
import { Results } from './pages/results';
import { StimulusDebug } from './pages/stimulus-debug';
import { Dashboard } from './pages/dashboard';
import { About } from './pages/about';

export function Routes() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/today" component={Today} />
      <Route path="/session/:sessionId" component={SessionRunner} />
      <Route path="/results/:sessionId" component={Results} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/about" component={About} />
      <Route path="/stimulus-debug" component={StimulusDebug} />
    </Router>
  );
}
