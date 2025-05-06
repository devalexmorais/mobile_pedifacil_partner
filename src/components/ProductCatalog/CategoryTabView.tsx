import React from 'react';
import { StyleSheet, Dimensions, useWindowDimensions, Text } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';

interface Category {
  id: string;
  name: string;
}

interface CategoryTabViewProps {
  categories: Category[];
  renderScene: (routeKey: string) => React.ReactNode;
  onIndexChange: (index: number) => void;
  initialIndex?: number;
}

type Route = {
  key: string;
  title: string;
};

export function CategoryTabView({ 
  categories, 
  renderScene, 
  onIndexChange,
  initialIndex = 0
}: CategoryTabViewProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const layout = useWindowDimensions();
  
  // Criando as rotas baseadas nas categorias
  const [routes] = React.useState<Route[]>(
    categories.map(category => ({ 
      key: category.id, 
      title: category.name 
    }))
  );

  // Manipula a mudança de índice e chama o callback
  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    onIndexChange(newIndex);
  };

  // Renderiza cada cena baseada na chave da rota
  const renderSceneForRoute = ({ route }: { route: Route }) => {
    return renderScene(route.key);
  };

  // Renderiza a barra de abas personalizada
  const renderCustomTabBar = (props: any) => {
    return (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.indicator}
        tabStyle={styles.tab}
        activeColor="#FFA500"
        inactiveColor="#666"
        scrollEnabled={true}
        renderLabel={({ route, focused }: { route: Route; focused: boolean }) => (
          <Text 
            style={[
              styles.label,
              { color: focused ? '#FFA500' : '#666' }
            ]}
          >
            {route.title}
          </Text>
        )}
      />
    );
  };

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderSceneForRoute}
      onIndexChange={handleIndexChange}
      initialLayout={{ width: layout.width }}
      renderTabBar={renderCustomTabBar}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  indicator: {
    backgroundColor: '#FFA500',
    height: 3,
  },
  label: {
    fontWeight: '600',
    textTransform: 'none',
    fontSize: 14,
  },
  tab: {
    width: 'auto',
    paddingHorizontal: 20,
  }
}); 