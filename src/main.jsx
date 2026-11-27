import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FloatingWidget from './components/FloatingWidget';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') === 'widget' ? 'widget' : 'hud';
document.body.classList.add(`mode-${mode}`);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{mode === 'widget' ? <FloatingWidget /> : <App />}</React.StrictMode>
);
