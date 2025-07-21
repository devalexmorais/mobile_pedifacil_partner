import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { establishmentService } from '../services/establishmentService';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

export function MainEstablishmentButton() {
  const [status, setStatus] = useState<{
    isOpen: boolean;
    operationMode: string;
    lastStatusChange: string;
    statusChangeReason: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { paymentStatus, loading: paymentLoading } = usePaymentStatus();

  // Debug do status de pagamento e reação a mudanças
  useEffect(() => {
    console.log('🏪 MainEstablishmentButton - Status de pagamento:', {
      hasOverdueInvoice: paymentStatus.hasOverdueInvoice,
      daysPastDue: paymentStatus.daysPastDue,
      isBlocked: paymentStatus.isBlocked,
      loading: paymentLoading
    });

    // Reação instantânea a mudanças de bloqueio
    if (paymentStatus.isBlocked) {
      console.log('🔒 BLOQUEIO DETECTADO - Interface será atualizada instantaneamente');
    } else if (paymentStatus.hasOverdueInvoice) {
      console.log('⚠️ FATURA VENCIDA DETECTADA - Mostrando aviso');
    } else {
      console.log('✅ STATUS NORMAL - Estabelecimento pode operar normalmente');
    }
  }, [paymentStatus, paymentLoading]);

  useEffect(() => {
    // Primeiro carregamento
    loadStatus();
    
    // Inicia a verificação automática - APENAS PARA FECHAMENTO AUTOMÁTICO
    // O estabelecimento NUNCA será aberto automaticamente, apenas fechado quando necessário
    establishmentService.startAutoStatusCheck();
    
    // Listener em tempo real para mudanças no status
    const user = auth.currentUser;
    let unsubscribe: (() => void) | null = null;
    
    if (user) {
      const partnerRef = doc(db, 'partners', user.uid);
      unsubscribe = onSnapshot(partnerRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('🔄 MUDANÇA EM TEMPO REAL detectada:', {
            isOpen: data.isOpen,
            operationMode: data.operationMode,
            statusChangeReason: data.statusChangeReason
          });
          
          setStatus({
            isOpen: data.isOpen || false,
            operationMode: data.operationMode || establishmentService.OPERATION_MODE.MANUAL,
            lastStatusChange: data.lastStatusChange || new Date().toISOString(),
            statusChangeReason: data.statusChangeReason || 'Status inicial'
          });
        }
      }, (error) => {
        console.error('Erro no listener do status:', error);
      });
    }
    
    // Limpeza quando o componente é desmontado
    return () => {
      establishmentService.stopAutoStatusCheck();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      
      // Primeiro, migra dados antigos se necessário
      await establishmentService.migrateEstablishmentData();
      
      // Depois carrega o status atual
      const currentStatus = await establishmentService.getEstablishmentStatus();
      
      console.log('🏪 MainEstablishmentButton - Status carregado:', currentStatus);
      setStatus(currentStatus);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      Alert.alert('Erro', 'Não foi possível carregar o status do estabelecimento');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    // Verifica se está bloqueado por pagamento
    if (paymentStatus.isBlocked) {
      Alert.alert(
        'Aplicativo Bloqueado',
        paymentStatus.blockingMessage,
        [
          {
            text: 'Ver Faturas',
            onPress: () => {
              // Aqui você pode navegar para a tela de faturas
              // navigation.navigate('faturas');
            }
          },
          { text: 'OK' }
        ]
      );
      return;
    }

    // Verifica se há fatura vencida (mesmo que não esteja bloqueado ainda)
    if (paymentStatus.hasOverdueInvoice) {
      Alert.alert(
        'Fatura em Atraso',
        `Você tem uma fatura vencida há ${paymentStatus.daysPastDue} dia${paymentStatus.daysPastDue !== 1 ? 's' : ''}. Efetue o pagamento antes de abrir o estabelecimento.`,
        [
          {
            text: 'Ver Faturas',
            onPress: () => {
              // Aqui você pode navegar para a tela de faturas
              // navigation.navigate('faturas');
            }
          },
          { text: 'OK' }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      const newStatus = !status?.isOpen;
      await establishmentService.toggleEstablishmentStatus(newStatus);
      await loadStatus(); // Recarrega o status após a mudança
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      Alert.alert(
        'Erro ao alterar status',
        error instanceof Error ? error.message : 'Ocorreu um erro ao alterar o status do estabelecimento.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };



  if (loading || !status || paymentLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  // Se há fatura vencida mas não está bloqueado (menos de 7 dias)
  if (paymentStatus.hasOverdueInvoice && !paymentStatus.isBlocked) {
    return (
      <View style={styles.container}>
        {/* Aviso de fatura vencida */}
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={colors.yellow[600]} />
          <Text style={styles.warningTitle}>Fatura em Atraso</Text>
          <Text style={styles.warningText}>
            Fatura vencida há {paymentStatus.daysPastDue} dia{paymentStatus.daysPastDue !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.warningSubText}>
            {paymentStatus.daysPastDue >= 4 
              ? `Atenção! Em ${7 - paymentStatus.daysPastDue} dia${7 - paymentStatus.daysPastDue !== 1 ? 's' : ''} o app será bloqueado.`
              : 'Efetue o pagamento o quanto antes.'
            }
          </Text>
        </View>

        {/* Botão normal, mas com estilo de aviso */}
        <TouchableOpacity
          style={[styles.button, styles.buttonWarning]}
          onPress={handleToggleStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {status.isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
          </Text>
          <Text style={styles.subText}>
            {status.isOpen ? 'Toque para fechar' : 'Toque para abrir'}
          </Text>
          <Text style={styles.modeText}>
            Modo: {status.operationMode === establishmentService.OPERATION_MODE.MANUAL ? 'Manual' : 'Automático (só fecha)'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se está bloqueado (mais de 7 dias)
  if (paymentStatus.isBlocked) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.button, styles.buttonBlocked]}
          onPress={() => {
            Alert.alert(
              'Estabelecimento Bloqueado',
              `Fatura vencida há ${paymentStatus.daysPastDue} dias. Efetue o pagamento da fatura para continuar usando o aplicativo.`,
              [{ text: 'OK' }]
            );
          }}
          disabled={true}
        >
          <Ionicons name="lock-closed" size={32} color={colors.white} style={{ marginBottom: 8 }} />
          <Text style={styles.buttonTextBlocked}>
            Estabelecimento Bloqueado
          </Text>
          <Text style={styles.subTextBlocked}>
          Pagamento necessário para desbloquear.
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Funcionamento normal (sem faturas vencidas)
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: status.isOpen ? colors.green[500] : colors.red[500] }]}
        onPress={handleToggleStatus}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {status.isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
        </Text>
        <Text style={styles.subText}>
          {status.isOpen ? 'Toque para fechar' : 'Toque para abrir'}
        </Text>
        <Text style={styles.modeText}>
          Modo: {status.operationMode === establishmentService.OPERATION_MODE.MANUAL ? 'Manual' : 'Automático (só fecha)'}
        </Text>
      </TouchableOpacity>
      

      
      {status.statusChangeReason && (
        <Text style={styles.reasonText}>
          Última alteração: {status.statusChangeReason}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  button: {
    padding: 12,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
  modeText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  reasonText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: colors.yellow[500],
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  warningTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  warningText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  warningSubText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonWarning: {
    backgroundColor: colors.yellow[600],
  },
  buttonBlocked: {
    backgroundColor: colors.red[600],
    paddingVertical: 20,
  },
  buttonTextBlocked: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subTextBlocked: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
}); 