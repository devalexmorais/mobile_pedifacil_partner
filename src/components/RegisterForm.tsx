import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Formik, Field } from 'formik';
import * as Yup from 'yup';
import { TextInput, HelperText, Button } from 'react-native-paper';
import { ErrorMessage } from './ErrorMessage';

interface FormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
  cnpj_or_cpf: string;
  storeName: string;
}

interface FormFieldProps {
  name: string;
  label: string;
  [key: string]: any;
}

interface RegisterFormProps {
  onSubmit: (values: FormValues) => Promise<any>;
}

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: Yup.string()
    .required('Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: Yup.string()
    .required('Telefone é obrigatório'),
  cnpj_or_cpf: Yup.string()
    .required('CPF/CNPJ é obrigatório'),
  storeName: Yup.string()
    .required('Nome da loja é obrigatório')
    .min(2, 'Nome da loja deve ter pelo menos 2 caracteres'),
});

const FormField: React.FC<FormFieldProps> = ({ name, label, ...props }) => {
  return (
    <Field name={name}>
      {({ field, form, meta }: any) => (
        <View style={styles.fieldContainer}>
          <TextInput
            label={label}
            onChangeText={form.handleChange(name)}
            onBlur={form.handleBlur(name)}
            value={field.value}
            error={meta.touched && meta.error}
            mode="outlined"
            {...props}
          />
          {meta.touched && meta.error && (
            <HelperText type="error" visible={true}>
              {meta.error}
            </HelperText>
          )}
        </View>
      )}
    </Field>
  );
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit }) => {
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (values: FormValues, { setSubmitting, setFieldError }: any) => {
    try {
      const result = await onSubmit(values);
      
      // Se houver erro retornado do service
      if (result?.error) {
        // Define o erro para ser mostrado no ErrorMessage
        setApiError(result.error);
        
        // Também mapeia os erros para os campos correspondentes
        if (result.error.includes('e-mail')) {
          setFieldError('email', result.error);
        } else if (result.error.includes('senha')) {
          setFieldError('password', result.error);
        } else if (result.error.includes('CPF/CNPJ')) {
          setFieldError('cnpj_or_cpf', result.error);
        }
      }
    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <Formik
        initialValues={{
          name: '',
          email: '',
          password: '',
          phone: '',
          cnpj_or_cpf: '',
          storeName: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit, isValid, dirty, isSubmitting }) => (
          <View style={styles.container}>
            {/* Mostra o erro da API usando o ErrorMessage */}
            {apiError && <ErrorMessage message={apiError} />}

            <FormField
              name="name"
              label="Nome Completo"
              placeholder="Digite seu nome completo"
              autoCapitalize="words"
            />

            <FormField
              name="email"
              label="Email"
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormField
              name="password"
              label="Senha"
              placeholder="Digite sua senha"
              secureTextEntry
            />

            <FormField
              name="phone"
              label="Telefone"
              placeholder="(99) 99999-9999"
              keyboardType="phone-pad"
            />

            <FormField
              name="cnpj_or_cpf"
              label="CPF/CNPJ"
              placeholder="Digite seu CPF ou CNPJ"
              keyboardType="numeric"
            />

            <FormField
              name="storeName"
              label="Nome da Loja"
              placeholder="Digite o nome da sua loja"
            />

            <Button
              mode="contained"
              onPress={() => handleSubmit()}
              disabled={!isValid || !dirty || isSubmitting}
              loading={isSubmitting}
              style={styles.button}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </View>
        )}
      </Formik>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
  },
}); 