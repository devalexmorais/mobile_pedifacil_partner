import { PlanProvider } from './contexts/PlanContext';

function App() {
  // Aqui você pode pegar o isPremium do seu backend ou estado global
  const isPremium = false;

  return (
    <PlanProvider isPremium={isPremium}>
      {/* Resto da sua aplicação */}
    </PlanProvider>
  );
}
export default App;

