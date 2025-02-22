import { usePlan } from '../contexts/PlanContext';

function ProductList() {
  const { isWithinPlanLimits, getPlanLimits, isPremium } = usePlan();
  const currentProductCount = 25; // Exemplo: número atual de produtos
  const limits = getPlanLimits();

  const handleAddProduct = () => {
    if (!isWithinPlanLimits(currentProductCount + 1)) {
      alert(`Você atingiu o limite de ${limits.maxProducts} produtos do seu plano!`);
      return;
    }
    // Lógica para adicionar produto
  };

  return (
    <div>
      <p>Limite do seu plano: {limits.maxProducts} produtos</p>
      <p>Produtos atuais: {currentProductCount}</p>

      {!isPremium && currentProductCount >= limits.maxProducts && (
        <div className="upgrade-warning" style={{ 
          backgroundColor: '#fff3cd', 
          color: '#856404', 
          padding: '1rem', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h4>Limite de produtos atingido!</h4>
          <p>Você atingiu o limite de {limits.maxProducts} produtos do plano gratuito.</p>
          <p>Faça upgrade para o plano Premium e cadastre produtos ilimitados!</p>
        </div>
      )}

      <button 
        onClick={handleAddProduct}
        disabled={!isPremium && currentProductCount >= limits.maxProducts}
        style={{
          opacity: (!isPremium && currentProductCount >= limits.maxProducts) ? 0.5 : 1
        }}
      >
        Adicionar Produto
      </button>
    </div>
  );
}

export default ProductList; 