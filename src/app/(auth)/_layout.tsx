import { Drawer } from 'expo-router/drawer';
import { useEffect } from 'react';
import { useRouter, Redirect } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, AntDesign, FontAwesome6, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { StatusBar } from 'react-native';
import { MainEstablishmentButton } from '@/components/MainEstablishmentButton';

<StatusBar
  barStyle="light-content" // Define o estilo do texto (claro ou escuro)
  backgroundColor="#FFA500" // Cor de fundo da status bar
/>

function CustomDrawerContent(props: any) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log('Iniciando processo de logout...');
      
      await authService.logout();
      
      console.log('Logout bem sucedido, redirecionando...');
      router.replace('/public/Login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <View style={styles.drawerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#FFA500" />
      <MainEstablishmentButton/>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerContent}>
          {/* Mantém os itens de navegação padrão */}
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>
      
      {/* Botão de logout */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AuthLayout() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/public/Login');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/public/Login" />;
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFA500',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#FFA500',
        drawerInactiveTintColor: '#666',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: 'Pedidos',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/profile"
        options={{
          title: 'Perfil',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/avaliacao"
        options={{
          title: 'Avaliações',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/product-catalog"
        options={{
          title: 'Catálogo',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/financeiro"
        options={{
          title: 'Financeiro',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <AntDesign name="linechart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/caixa"
        options={{
          title: 'Caixa',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/faturas"
        options={{
          title: 'Faturas',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/checkout"
        options={{
          title: 'Checkout',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/taxas"
        options={{
          title: 'taxas',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <FontAwesome6 name="percentage" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/signature"
        options={{
          title: 'Seja Premium',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="diamond" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerContent: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#FFF5F5',
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
});