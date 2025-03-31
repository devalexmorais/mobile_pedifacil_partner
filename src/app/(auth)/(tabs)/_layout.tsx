import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Text } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { usePedidos } from '../../../contexts/PedidosContext';

interface TabBarIconProps {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    size: number;
    badgeCount?: number;
}

const TabBarIcon = ({ name, color, size, badgeCount = 0 }: TabBarIconProps) => {
    return (
        <View style={{ width: 24, height: 24 }}>
            <Ionicons name={name} size={size} color={color} />
            {badgeCount > 0 && (
                <View style={{
                    position: 'absolute',
                    right: -12,
                    top: -5,
                    backgroundColor: '#FFA500',
                    borderRadius: 12,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 'bold',
                    }}>
                        {badgeCount}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const { 
        pedidosPendentes,
        pedidosCozinha,
        pedidosProntos,
        pedidosEmEntrega
    } = usePedidos();

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated]);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#FFA500',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: colorScheme === 'dark' ? '#1C1C1E' : '#C6C6C8',
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="pedidos"
                options={{
                    title: 'Pedidos',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon 
                            name="receipt-outline" 
                            size={size} 
                            color={color}
                            badgeCount={pedidosPendentes.length}
                        />
                    ),
                    tabBarLabel: 'Pedidos',
                }}
            />
            <Tabs.Screen
                name="preparando"
                options={{
                    title: 'Em Preparo',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon 
                            name="time-outline" 
                            size={size} 
                            color={color}
                            badgeCount={pedidosCozinha.length}
                        />
                    ),
                    tabBarLabel: 'Preparo',
                }}
            />
            <Tabs.Screen
                name="pronto"
                options={{
                    title: 'Prontos',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon 
                            name="checkmark-circle-outline" 
                            size={size} 
                            color={color}
                            badgeCount={pedidosProntos.length}
                        />
                    ),
                    tabBarLabel: 'Prontos',
                }}
            />
            <Tabs.Screen
                name="em-entrega"
                options={{
                    title: 'Em Entrega',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon 
                            name="bicycle-outline" 
                            size={size} 
                            color={color}
                            badgeCount={pedidosEmEntrega.length}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}