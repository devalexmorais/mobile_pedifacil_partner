import { Stack } from 'expo-router';
import { RegisterFormProvider } from './context';

export default function RegisterLayout() {
  return (
    <RegisterFormProvider>
      <Stack>
        <Stack.Screen 
          name="basic-info" 
          options={{ 
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="phone" 
          options={{ 
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="address" 
          options={{ 
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="documents" 
          options={{ 
            headerShown: false 
          }} 
        />
      </Stack>
    </RegisterFormProvider>
  );
} 