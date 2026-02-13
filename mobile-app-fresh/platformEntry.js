// Punto de entrada condicional para web y móvil
import App from './App';

if (typeof document !== 'undefined') {
  // Estamos en la web
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
  });
} else {
  // Estamos en móvil (Expo/React Native)
  import('expo').then(({ registerRootComponent }) => {
    registerRootComponent(App);
  });
}
