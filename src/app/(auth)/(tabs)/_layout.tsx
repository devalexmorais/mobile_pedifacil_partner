import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';


export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { isAuthenticated } = useAuth();
    const router = useRouter();

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
                        <Ionicons name="receipt-outline" size={size} color={color} />
                    ),
                    tabBarLabel: 'Pedidos',
                }}
            />
            <Tabs.Screen
                name="preparando"
                options={{
                    title: 'Em Preparo',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time-outline" size={size} color={color} />
                    ),
                    tabBarLabel: 'Preparo',
                }}
            />
            <Tabs.Screen
                name="pronto"
                options={{
                    title: 'Prontos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="checkmark-circle-outline" size={size} color={color} />
                    ),
                    tabBarLabel: 'Prontos',
                }}
            />
            <Tabs.Screen
                name="em-entrega"
                options={{
                    title: 'Em Entrega',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bicycle-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}