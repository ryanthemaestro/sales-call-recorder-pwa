import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

console.log('%c🔥 REACT APP STARTING!', 'background: red; color: white; font-size: 24px; padding: 10px;');
console.log('index.tsx executing, React version:', React.version);
console.log('Build timestamp:', new Date().toISOString());

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('%c⚛️ RENDERING APP COMPONENT', 'background: cyan; color: black; font-size: 18px; padding: 8px;');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('%c✅ APP RENDERED SUCCESSFULLY', 'background: green; color: white; font-size: 18px; padding: 8px;');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
