import { Drawer } from 'expo-router/drawer';
import { useRouter} from 'expo-router';
import { View,SafeAreaView, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, AntDesign, FontAwesome6, FontAwesome } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { StatusBar } from 'react-native';
import { MainEstablishmentButton } from '@/components/MainEstablishmentButton';
import { signOut, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import { establishmentService } from '../../services/establishmentService';

<StatusBar
  barStyle="light-content" // Define o estilo do texto (claro ou escuro)
  backgroundColor="#FFA500" // Cor de fundo da status bar
/>

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const isMounted = useRef(true);
  
  const handleLogout = async () => {
    try {
      console.log('Iniciando processo de logout...');
      
      // Para a verificação automática do status do estabelecimento
      establishmentService.stopAutoStatusCheck();
      
      const auth = getAuth();
      await signOut(auth);
      
      // Remover token e dados do usuário
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_data');
      
      console.log('Logout bem sucedido, redirecionando...');
      if (isMounted.current) {
        // Usar setTimeout para adiar a navegação
        setTimeout(() => {
          router.replace('/');
        }, 100);
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  useEffect(() => {
    // Definir flag de componente montado
    isMounted.current = true;
    
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (!token && isMounted.current) {
          console.log('Token não encontrado, redirecionando para login...');
          // Usar setTimeout para adiar a navegação
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (isMounted.current) {
          // Usar setTimeout para adiar a navegação
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }
      }
    };

    // Adiar a verificação para garantir que o componente esteja completamente montado
    const timer = setTimeout(() => {
      checkAuthStatus();
    }, 500);
    
    // Limpar na desmontagem
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.drawerContainer}>
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
    </SafeAreaView>
  );
}

export default function AuthLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  // Buscar contagem de notificações não lidas
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let unsubscribe: () => void;

    const fetchUnreadCount = async () => {
      try {
        // Verificar se o usuário está autenticado antes de buscar notificações
        if (notificationService.isAuthenticated()) {
          const count = await notificationService.getUnreadNotificationsCount();
          setUnreadCount(count);
        } else {
          // Se não estiver autenticado, definir como 0
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Erro ao buscar notificações não lidas:', error);
        setUnreadCount(0);
      }
    };

    // Configurar listener em tempo real para notificações
    const setupListener = async () => {
      if (notificationService.isAuthenticated()) {
        unsubscribe = notificationService.setupNotificationsListener((notifications) => {
          const unreadCount = notifications.filter(n => !n.read).length;
          setUnreadCount(unreadCount);
        });
      }
    };

    // Adiar a primeira busca e configuração do listener
    const timer = setTimeout(() => {
      fetchUnreadCount();
      setupListener();
      
      // Atualizar a cada 1 minuto como backup
      interval = setInterval(fetchUnreadCount, 60000);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Função para navegar para tela de notificações
  const navigateToNotifications = () => {
    router.push('/(auth)/drawer/notifications');
  };

  // Componente de botão de notificações para o header
  const NotificationButton = () => (
    <TouchableOpacity 
      style={styles.headerButton} 
      onPress={navigateToNotifications}
    >
      <View>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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
          headerRight: () => <NotificationButton />,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drawer/notifications"
        options={{
          title: 'Notificações',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <View style={{ width: 24, height: 24, marginRight: 0 }}>
              <Ionicons name="notifications-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
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
        name="drawer/coupons"
        options={{
          title: 'Cupons',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={color} />
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
  notificationBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerButton: {
    marginRight: 16,
    padding: 6,
  },
});