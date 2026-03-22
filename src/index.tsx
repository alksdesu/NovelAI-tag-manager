import { render } from 'solid-js/web';
import App from './App';

function mount() {
  const container = document.createElement('div');
  container.id = 'nai-tag-maestro-root';
  document.body.appendChild(container);
  render(() => <App />, container);
}

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
