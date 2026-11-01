import { render } from 'preact';
import { App } from './app';
import { applyTheme } from './lib/store';
import { pullOnStart } from './lib/account';
import './styles.css';

applyTheme();
pullOnStart();
render(<App />, document.getElementById('app')!);

