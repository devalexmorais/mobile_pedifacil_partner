import { doc, updateDoc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, deleteField } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { establishmentSettingsService } from './establishmentSettingsService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { notificationService } from './notificationService';

export const establishmentService = {
  // Tempo de inatividade em minutos antes de fechar a loja automaticamente
  INACTIVITY_TIMEOUT_MINUTES: 15,
  
  // Rastreia a última vez que um pedido foi processado (aceito ou recusado)
  lastOrderProcessedTime: null as Date | null,
  
  // Temporizador para verificação de inatividade
  _inactivityTimer: null as NodeJS.Timeout | null,
  
  // Flag para controlar se o monitoramento de inatividade deve estar ativo
  _inactivityMonitoringActive: false,
  
  // Modo de operação da loja
  OPERATION_MODE: {
    MANUAL: 'manual',
    AUTOMATIC: 'automatic'
  },
  
  // Timer para verificação automática
  _statusCheckInterval: null as NodeJS.Timeout | null,
  
  // Verifica se o estabelecimento deve estar aberto com base nos horários configurados
  async checkAutoOpenStatus(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      // Primeiro verifica se a loja está aberta manualmente
      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);
      
      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        // Se a loja está aberta manualmente, retorna true (removido check de inatividade)
        if (data.isOpen === true) {
          return true;
        }
      }

      // Se não estiver aberta manualmente, verifica o horário
      const schedule = await establishmentSettingsService.getSchedule();
      if (!schedule) return false;

      // Obter o dia da semana atual
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const now = new Date();
      const dayOfWeek = dayNames[now.getDay()];
      
      // Verificar se o dia está configurado para estar aberto
      const dayConfig = schedule[dayOfWeek];
      if (!dayConfig || !dayConfig.isOpen) {
        return false;
      }
      
      // Comparar o horário atual com o horário de funcionamento
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Verificar se estamos dentro do horário de funcionamento
      if (currentTime >= dayConfig.openTime && currentTime <= dayConfig.closeTime) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar status automático:', error);
      return false;
    }
  },

  // Obtém o status atual do estabelecimento
  async getEstablishmentStatus(): Promise<{
    isOpen: boolean;
    operationMode: string;
    lastStatusChange: string;
    statusChangeReason: string;
  }> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        

        
        const result = {
          isOpen: data.isOpen || false,
          operationMode: data.operationMode || this.OPERATION_MODE.MANUAL,
          lastStatusChange: data.lastStatusChange || new Date().toISOString(),
          statusChangeReason: data.statusChangeReason || 'Status inicial'
        };
        

        return result;
      }

      // Se não existir, cria com status padrão
      const defaultStatus = {
        isOpen: false,
        operationMode: this.OPERATION_MODE.MANUAL,
        lastStatusChange: new Date().toISOString(),
        statusChangeReason: 'Status inicial',
        closedDueToInactivity: false,
        inactivityMessage: null
      };

      await setDoc(partnerRef, defaultStatus);
      
      return {
        isOpen: defaultStatus.isOpen,
        operationMode: defaultStatus.operationMode,
        lastStatusChange: defaultStatus.lastStatusChange,
        statusChangeReason: defaultStatus.statusChangeReason
      };
    } catch (error) {
      console.error('Erro ao obter status do estabelecimento:', error);
      throw error;
    }
  },

  // Migra estrutura antiga para nova (se necessário)
  async migrateEstablishmentData(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        
        // Se ainda tem a estrutura aninhada antiga, migra e limpa
        if (data.establishmentStatus) {

          
          const establishmentStatus = data.establishmentStatus;
          
          const updateData: any = {
            // Mantém apenas os campos essenciais na estrutura direta
            isOpen: data.isOpen !== undefined ? data.isOpen : (establishmentStatus.isOpen || false),
            operationMode: data.operationMode || establishmentStatus.operationMode || this.OPERATION_MODE.MANUAL,
            lastStatusChange: data.lastStatusChange || establishmentStatus.lastStatusChange || new Date().toISOString(),
            statusChangeReason: data.statusChangeReason || establishmentStatus.statusChangeReason || 'Estrutura limpa',
            
            // Remove estrutura aninhada e campos desnecessários
            establishmentStatus: deleteField(),
            closedDueToInactivity: false,
            inactivityMessage: deleteField(),
            blockedSince: deleteField(),
            blockingReason: deleteField(),
            manuallyClosedUntil: deleteField(),
            hasUnSettledFees: deleteField() // Remove este campo também
          };
          
          await updateDoc(partnerRef, updateData);

        }
        
        // Limpeza adicional de campos desnecessários mesmo sem estrutura aninhada
        else if (data.hasUnSettledFees !== undefined || data.establishmentStatus !== undefined) {

          
          const cleanupData: any = {};
          
          if (data.hasUnSettledFees !== undefined) {
            cleanupData.hasUnSettledFees = deleteField();
          }
          if (data.establishmentStatus !== undefined) {
            cleanupData.establishmentStatus = deleteField();
          }
          
          await updateDoc(partnerRef, cleanupData);
          console.log('✅ LIMPEZA adicional concluída');
        }
      }
    } catch (error) {
      console.error('Erro ao migrar dados do estabelecimento:', error);
    }
  },

  // Método para registrar a última atividade de pedido
  registerOrderActivity() {
    const now = new Date();
    this.lastOrderProcessedTime = now;
    console.log(`🔔 Atividade de pedido registrada às ${now.toLocaleTimeString()}, resetando temporizador de inatividade`);
    
    // Ativa o monitoramento de inatividade SEMPRE que há novo pedido
    this._inactivityMonitoringActive = true;
    
    // Reinicia a verificação de inatividade
    this.startInactivityCheck();
  },
  
  // Inicia a verificação de inatividade
  startInactivityCheck() {
    console.log("🔄 Iniciando verificação de inatividade");
    
    // Limpa qualquer temporizador existente
    if (this._inactivityTimer) {
      clearInterval(this._inactivityTimer);
      this._inactivityTimer = null;
    }
    
    // Define um novo temporizador - verifica a cada minuto
    this._inactivityTimer = setInterval(async () => {
      try {
        await this.checkInactivity();
      } catch (error) {
        console.error('❌ Erro ao verificar inatividade:', error);
      }
    }, 60000); // Verifica a cada minuto
    
    console.log("⏰ Temporizador de inatividade iniciado - próxima verificação em 1 minuto");
    
    // Executa uma verificação imediata também
    setTimeout(() => {
      this.checkInactivity().catch(error => {
        console.error('❌ Erro na verificação imediata de inatividade:', error);
      });
    }, 5000); // Verifica após 5 segundos
  },
  
  // Verifica se houve inatividade por tempo suficiente para fechar a loja
  async checkInactivity() {
    try {
      console.log("🔍 Iniciando verificação de inatividade");
      
      const user = auth.currentUser;
      if (!user) {
        console.log("❌ Usuário não autenticado, parando verificações de inatividade");
        return;
      }

      // Verifica se existem pedidos pendentes
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      const pendingOrdersQuery = query(
        ordersRef,
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingOrdersQuery);
      
      if (snapshot.empty) {
        console.log("✅ Nenhum pedido pendente encontrado");
        return;
      }

      console.log(`📋 Encontrados ${snapshot.size} pedido(s) pendente(s)`);
      const now = new Date();
      let canceledCount = 0;
      const canceledOrders: Array<{ orderId: string, customerName?: string, totalValue?: number, minutesPending?: number }> = [];
      
      // Primeiro, verifica se algum pedido deve ser cancelado por inatividade (15+ min)
      let hasInactiveOrder = false;
      const ordersWithTimes: Array<{ doc: any, orderData: any, diffMinutes: number, orderCreatedAt: Date }> = [];
      
      for (const doc of snapshot.docs) {
        const orderData = doc.data();
        
        // Melhor conversão de data para lidar com diferentes formatos
        let orderCreatedAt: Date;
        
        if (orderData.createdAt?.toDate) {
          // Firebase Timestamp
          orderCreatedAt = orderData.createdAt.toDate();
        } else if (orderData.createdAt?.seconds) {
          // Firebase Timestamp em formato object
          orderCreatedAt = new Date(orderData.createdAt.seconds * 1000);
        } else if (typeof orderData.createdAt === 'string') {
          // String ISO
          orderCreatedAt = new Date(orderData.createdAt);
        } else {
          // Fallback para agora
          console.log(`⚠️ Não foi possível determinar data de criação do pedido ${doc.id}`);
          orderCreatedAt = now;
        }
        
        const diffMinutes = Math.floor((now.getTime() - orderCreatedAt.getTime()) / (1000 * 60));
        console.log(`⏱️ Pedido ${doc.id} está pendente há ${diffMinutes} minutos (criado em: ${orderCreatedAt.toLocaleString()})`);
        
        ordersWithTimes.push({ doc, orderData, diffMinutes, orderCreatedAt });
        
        // Verifica se tem pelo menos um pedido com 15+ minutos
        if (diffMinutes >= this.INACTIVITY_TIMEOUT_MINUTES) {
          hasInactiveOrder = true;
        }
      }
      
      // Se encontrou pelo menos um pedido inativo, cancela TODOS os pedidos pendentes
      if (hasInactiveOrder) {
        console.log(`🚨 INATIVIDADE DETECTADA - Cancelando TODOS os ${ordersWithTimes.length} pedidos pendentes`);
        
        for (const { doc, orderData, diffMinutes } of ordersWithTimes) {
          console.log(`🚫 CANCELANDO pedido ${doc.id} (${diffMinutes} minutos) - cancelamento em massa por inatividade`);
          
          try {
            // Cancela o pedido no Firestore
            await updateDoc(doc.ref, {
              status: 'canceled',
              canceledAt: new Date().toISOString(),
              cancelReason: diffMinutes >= this.INACTIVITY_TIMEOUT_MINUTES 
                ? `Pedido cancelado automaticamente por inatividade após ${diffMinutes} minutos`
                : `Pedido cancelado automaticamente junto com outros pedidos por inatividade do estabelecimento`
            });
            
            // Adiciona à lista de pedidos cancelados para notificação
            canceledOrders.push({
              orderId: doc.id,
              customerName: orderData.userName || orderData.customerName,
              totalValue: orderData.totalPrice || orderData.finalPrice,
              minutesPending: diffMinutes
            });
            
            canceledCount++;
            console.log(`✅ Pedido ${doc.id} cancelado com sucesso`);
          } catch (error) {
            console.error(`❌ Erro ao cancelar pedido ${doc.id}:`, error);
          }
        }
      } else {
        console.log(`⏳ Nenhum pedido atingiu o limite de inatividade (${this.INACTIVITY_TIMEOUT_MINUTES} min)`);
      }
      
      // Cria notificações para todos os pedidos cancelados
      if (canceledOrders.length > 0) {
        console.log(`📬 Criando notificação(ões) para ${canceledOrders.length} pedido(s) cancelado(s)`);
        
        if (canceledOrders.length === 1) {
          // Notificação individual
          const order = canceledOrders[0];
          await notificationService.createInactivityNotification(order.orderId, {
            customerName: order.customerName,
            totalValue: order.totalValue,
            minutesPending: order.minutesPending
          });
        } else {
          // Notificação em lote
          await notificationService.createBulkInactivityNotification(canceledOrders);
        }
        
        console.log(`✅ Notificação(ões) de inatividade enviada(s)`);
      }
      
      if (canceledCount > 0) {
        console.log(`🎯 TOTAL CANCELADO: ${canceledCount} pedido(s) por inatividade`);
        
        // Verifica se ainda existem pedidos pendentes após o cancelamento automático
        const updatedSnapshot = await getDocs(pendingOrdersQuery);
        
        // Se não houver mais pedidos pendentes, fecha a loja
        if (updatedSnapshot.empty) {
          console.log("🏪 Fechando loja automaticamente - nenhum pedido pendente restante");
          
          const partnerRef = doc(db, 'partners', user.uid);
          await updateDoc(partnerRef, {
            isOpen: false,
            lastStatusChange: new Date().toISOString(),
            statusChangeReason: `Loja fechada automaticamente por inatividade - ${canceledCount} pedido(s) cancelado(s)`
          });
          
          // Cria notificação sobre o fechamento da loja
          await notificationService.createStoreClosedInactivityNotification(canceledCount);
          
          console.log("✅ Loja fechada automaticamente por inatividade e notificação enviada");
          
          // Desativa o monitoramento de inatividade
          this._inactivityMonitoringActive = false;
          this.lastOrderProcessedTime = null;
          
          if (this._inactivityTimer) {
            clearInterval(this._inactivityTimer);
            this._inactivityTimer = null;
          }
        }
      } else {
        console.log("⏳ Nenhum pedido precisa ser cancelado ainda");
      }
    } catch (error) {
      console.error('❌ Erro ao verificar inatividade:', error);
    }
  },
  
  // Verifica se a loja está aberta
  async isStoreOpen(userId: string): Promise<boolean> {
    try {
      const partnerRef = doc(db, 'partners', userId);
      const partnerDoc = await getDoc(partnerRef);
      
      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return data.isOpen === true;  // Usa apenas o campo isOpen
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar status da loja:', error);
      return false;
    }
  },
  
  // Cancela todos os pedidos pendentes devido à inatividade
  async cancelPendingOrdersDueToInactivity(userId: string): Promise<number> {
    try {
      const ordersRef = collection(db, 'partners', userId, 'orders');
      const pendingOrdersQuery = query(
        ordersRef,
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingOrdersQuery);
      
      if (snapshot.empty) {
        console.log('Nenhum pedido pendente para cancelar por inatividade');
        return 0;
      }
      
      console.log(`Cancelando ${snapshot.size} pedidos pendentes por inatividade`);
      
      // Array para processar batch updates
      const updatePromises: Promise<void>[] = [];
      
      // Atualiza cada pedido pendente
      snapshot.forEach((doc) => {
        const orderRef = doc.ref;
        const updatePromise = updateDoc(orderRef, {
          status: 'inactivity', // Novo status específico para pedidos cancelados por inatividade
          updatedAt: new Date().toISOString(),
          inactivityMessage: "Pedido cancelado automaticamente devido à inatividade do estabelecimento."
        });
        
        updatePromises.push(updatePromise);
      });
      
      // Aguarda todos os updates completarem
      await Promise.all(updatePromises);
      
      console.log('Todos os pedidos pendentes foram cancelados por inatividade');
      return snapshot.size;
    } catch (error) {
      console.error('Erro ao cancelar pedidos por inatividade:', error);
      return 0;
    }
  },
  
  // Busca a data do último pedido processado no Firestore
  async fetchLastOrderActivity() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      
      // Busca todos os pedidos recentes, incluindo pendentes
      const recentOrdersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(recentOrdersQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        // Considera a data de criação como atividade para todos os pedidos
        if (data.createdAt) {
          // Converte o timestamp para Date
          if (typeof data.createdAt === 'string') {
            this.lastOrderProcessedTime = new Date(data.createdAt);
          } else if (data.createdAt.toDate) {
            this.lastOrderProcessedTime = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            this.lastOrderProcessedTime = new Date(data.createdAt.seconds * 1000);
          }
          
          console.log('Último pedido encontrado:', this.lastOrderProcessedTime);
          return;
        }
        
        // Se não conseguir obter createdAt, tenta updatedAt
        if (data.updatedAt) {
          // Converte o timestamp para Date
          if (typeof data.updatedAt === 'string') {
            this.lastOrderProcessedTime = new Date(data.updatedAt);
          } else if (data.updatedAt.toDate) {
            this.lastOrderProcessedTime = data.updatedAt.toDate();
          } else if (data.updatedAt.seconds) {
            this.lastOrderProcessedTime = new Date(data.updatedAt.seconds * 1000);
          }
          
          console.log('Último pedido encontrado (updatedAt):', this.lastOrderProcessedTime);
        }
      } else {
        console.log('Nenhum pedido encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar último pedido:', error);
    }
  },

  // Obtém os dados completos do parceiro
  async getPartnerData() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);
      
      if (partnerDoc.exists()) {
        return partnerDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter dados do parceiro:', error);
      return null;
    }
  },
  
  // Alterna o status do estabelecimento (abrir/fechar)
  async toggleEstablishmentStatus(isOpen: boolean): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Força renovação do token antes de chamar Cloud Functions
      await user.getIdToken(true);

      // Se estiver tentando abrir, primeiro verifica se pode via Cloud Function
      if (isOpen) {
        const functions = getFunctions();
        const verificarPermissao = httpsCallable(functions, 'verificarPermissaoAbertura', {
          timeout: 10000
        });
        
        try {
          const result = await verificarPermissao();
          const data = result.data as any;
          
          if (!data.canOpen) {
            throw new Error(data.reason || 'Estabelecimento não pode ser aberto devido a pendências de pagamento');
          }
          
        } catch (cloudError: any) {
          // Se é erro de permissão, repassa a mensagem
          if (cloudError.code === 'functions/permission-denied') {
            throw new Error(cloudError.message);
          }
          
          // Para outros erros, faz verificação local de segurança
          // Verificação local de faturas vencidas como fallback
          const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
          const overdueQuery = query(
            invoicesRef,
            where('status', 'in', ['pending', 'overdue'])
          );
          
          const invoicesSnapshot = await getDocs(overdueQuery);
          if (!invoicesSnapshot.empty) {
            const today = new Date();
            let maxDaysPastDue = 0;
            
            invoicesSnapshot.docs.forEach(doc => {
              const invoice = doc.data();
              const dueDate = invoice.endDate.toDate();
              
              if (dueDate < today) {
                const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysPastDue > maxDaysPastDue) {
                  maxDaysPastDue = daysPastDue;
                }
              }
            });
            
            if (maxDaysPastDue > 0) {
              throw new Error(`Estabelecimento não pode ser aberto devido a fatura vencida há ${maxDaysPastDue} dia${maxDaysPastDue !== 1 ? 's' : ''}. Efetue o pagamento para continuar.`);
            }
          }
        }
      }

      // Se estiver fechando, verifica pedidos pendentes
      if (!isOpen) {
        const ordersRef = collection(db, 'partners', user.uid, 'orders');
        const pendingOrdersQuery = query(
          ordersRef,
          where('status', '==', 'pending')
        );
        
        const snapshot = await getDocs(pendingOrdersQuery);
        if (!snapshot.empty) {
          throw new Error(`Não é possível fechar a loja enquanto existem ${snapshot.size} pedido(s) pendente(s).`);
        }
      }

      // Usa a Cloud Function segura para atualizar o status
      const functions = getFunctions();
      const atualizarStatus = httpsCallable(functions, 'atualizarStatusEstabelecimento', {
        timeout: 10000
      });
      
      try {
        const result = await atualizarStatus({
          isOpen,
          reason: isOpen 
            ? 'Aberto manualmente pelo usuário'
            : 'Fechado manualmente pelo usuário'
        });
        
        const data = result.data as any;
        
      } catch (cloudError: any) {
        // Se é erro de permissão, repassa a mensagem
        if (cloudError.code === 'functions/permission-denied') {
          throw new Error(cloudError.message);
        }
        
        // Para outros erros, tenta atualização local como fallback
        const partnerRef = doc(db, 'partners', user.uid);
        
        // Prepara os dados de atualização
        const updateData: any = {
          isOpen: isOpen,
          operationMode: this.OPERATION_MODE.MANUAL,
          lastStatusChange: new Date().toISOString(),
          statusChangeReason: isOpen 
            ? 'Aberto manualmente pelo usuário (fallback)'
            : 'Fechado manualmente pelo usuário (fallback)'
        };
        
        // Se estiver abrindo, limpa campos de inatividade
        if (isOpen) {
          updateData.closedDueToInactivity = false;
          updateData.inactivityMessage = null;
        }
        
        await updateDoc(partnerRef, updateData);
      }

    } catch (error) {
      throw error;
    }
  },

  // Verifica e atualiza o status baseado no horário
  async checkAndUpdateStatus(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);
      
      if (!partnerDoc.exists()) return;

      const data = partnerDoc.data();
      
      // Se estiver no modo manual, não faz nada
      if (data.operationMode === this.OPERATION_MODE.MANUAL) {
        return;
      }

      // Verifica o horário atual
      const schedule = await establishmentSettingsService.getSchedule();
      if (!schedule) return;

      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const now = new Date();
      const dayOfWeek = dayNames[now.getDay()];
      
      const dayConfig = schedule[dayOfWeek];
      if (!dayConfig || !dayConfig.isOpen) {
        if (data.isOpen) {
          await updateDoc(partnerRef, {
            isOpen: false,
            lastStatusChange: new Date().toISOString(),
            statusChangeReason: 'Fechado automaticamente - fora do horário de funcionamento'
          });
        }
        return;
      }
      
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const shouldBeOpen = currentTime >= dayConfig.openTime && currentTime <= dayConfig.closeTime;
      
      if (data.isOpen !== shouldBeOpen) {
        await updateDoc(partnerRef, {
          isOpen: shouldBeOpen,
          lastStatusChange: new Date().toISOString(),
          statusChangeReason: shouldBeOpen 
            ? 'Aberto automaticamente - dentro do horário de funcionamento'
            : 'Fechado automaticamente - fora do horário de funcionamento'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  },

  // Alterna o modo de operação (manual/automático)
  async toggleOperationMode(mode: string): Promise<void> {
    try {
      if (mode !== this.OPERATION_MODE.MANUAL && mode !== this.OPERATION_MODE.AUTOMATIC) {
        throw new Error('Modo de operação inválido');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        operationMode: mode,
        lastModeChange: new Date().toISOString()
      });

      console.log(`Modo de operação alterado para: ${mode}`);

      // Gerencia o timer baseado no novo modo
      if (mode === this.OPERATION_MODE.AUTOMATIC) {
        console.log('⏰ Mudou para automático - iniciando timer de verificação');
        this.startAutoStatusCheck(); // Inicia timer para modo automático
      } else {
        console.log('🎛️ Mudou para manual - parando timer de verificação (economia de recursos)');
        this.stopAutoStatusCheck(); // Para timer no modo manual
      }
    } catch (error) {
      console.error('Erro ao alternar modo de operação:', error);
      throw error;
    }
  },

  // Inicia a verificação automática de status APENAS se modo automático
  startAutoStatusCheck(): void {
    // Limpa intervalo existente
    if (this._statusCheckInterval) {
      clearInterval(this._statusCheckInterval);
      this._statusCheckInterval = null;
    }

    // Verifica o modo atual antes de iniciar timer
    const user = auth.currentUser;
    if (!user) return;

    // Verifica modo atual de forma assíncrona
    this.checkCurrentModeAndStartTimer();
    
    // NOVO: Inicia monitoramento de pedidos se a loja estiver aberta
    this.initializeOrdersMonitoring();
  },

  // Função auxiliar para verificar modo e iniciar timer se necessário
  async checkCurrentModeAndStartTimer(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);
      
      if (!partnerDoc.exists()) return;

      const data = partnerDoc.data();
      
      // Se estiver no modo manual, NÃO inicia timer
      if (data.operationMode === this.OPERATION_MODE.MANUAL) {
        return;
      }

      // Se estiver no modo automático, inicia timer
      
      this._statusCheckInterval = setInterval(async () => {
        try {
          // Verifica novamente o modo a cada execução (caso tenha mudado)
          const currentPartnerDoc = await getDoc(partnerRef);
          if (!currentPartnerDoc.exists()) return;

          const currentData = currentPartnerDoc.data();
          
          // Se mudou para manual, para o timer
          if (currentData.operationMode === this.OPERATION_MODE.MANUAL) {
            this.stopAutoStatusCheck();
            return;
          }

          // Verifica se a loja está aberta manualmente
          if (currentData.isOpen && currentData.lastStatusChange && currentData.statusChangeReason?.includes('manualmente')) {
            return;
          }

          // Verifica o horário atual
          const schedule = await establishmentSettingsService.getSchedule();
          if (!schedule) return;

          const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
          const now = new Date();
          const dayOfWeek = dayNames[now.getDay()];
          
          const dayConfig = schedule[dayOfWeek];
          if (!dayConfig || !dayConfig.isOpen) {
            if (currentData.isOpen) {
              await updateDoc(partnerRef, {
                isOpen: false,
                lastStatusChange: new Date().toISOString(),
                statusChangeReason: 'Fechado automaticamente - fora do horário de funcionamento'
              });

            }
            return;
          }
          
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const shouldBeOpen = currentTime >= dayConfig.openTime && currentTime <= dayConfig.closeTime;
          
          if (currentData.isOpen !== shouldBeOpen) {
            await updateDoc(partnerRef, {
              isOpen: shouldBeOpen,
              lastStatusChange: new Date().toISOString(),
              statusChangeReason: shouldBeOpen 
                ? 'Aberto automaticamente - dentro do horário de funcionamento'
                : 'Fechado automaticamente - fora do horário de funcionamento'
            });

          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5 * 60 * 1000); // 5 minutos

    } catch (error) {
      console.error('Erro ao verificar modo atual:', error);
    }
  },

  // Para a verificação automática
  stopAutoStatusCheck(): void {
    if (this._statusCheckInterval) {
      clearInterval(this._statusCheckInterval);
      this._statusCheckInterval = null;
    }
  },

  // NOVA: Inicializa o monitoramento de pedidos se a loja estiver aberta
  async initializeOrdersMonitoring(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Verifica se a loja está aberta
      const isOpen = await this.isStoreOpen(user.uid);
      if (!isOpen) {
        return;
      }

      // Verifica se já existem pedidos pendentes
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      const pendingOrdersQuery = query(
        ordersRef,
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingOrdersQuery);
      
      if (!snapshot.empty) {
        console.log(`🔔 Encontrados ${snapshot.size} pedido(s) pendente(s) existente(s) - ativando monitoramento`);
        
        // Ativa o monitoramento de inatividade
        this._inactivityMonitoringActive = true;
        this.registerOrderActivity();
        
        // Inicia o monitoramento de novos pedidos
        this.startNewOrdersMonitoring();
      } else {
        // Ainda assim inicia o listener para novos pedidos
        this.startNewOrdersMonitoring();
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar monitoramento de pedidos:', error);
    }
  },
  
  // Começa a monitorar novos pedidos
  startNewOrdersMonitoring() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Primeiro, verifica se a loja está aberta
      this.isStoreOpen(user.uid).then(isOpen => {
        // Se a loja estiver fechada, cancelamos qualquer monitoramento existente e não iniciamos um novo
        if (!isOpen) {
          if (this._newOrdersUnsubscribe) {
            this._newOrdersUnsubscribe();
            this._newOrdersUnsubscribe = null;
          }
          return;
        }
        
        // Se já existe um monitoramento, cancela
        if (this._newOrdersUnsubscribe) {
          this._newOrdersUnsubscribe();
          this._newOrdersUnsubscribe = null;
        }
        
        const ordersRef = collection(db, 'partners', user.uid, 'orders');
        const newOrdersQuery = query(
          ordersRef,
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        
        // Registra a última vez que houve um snapshot para detectar apenas novos pedidos
        let lastSnapshotTime = new Date();
        
        // Cria um listener para novos pedidos
        this._newOrdersUnsubscribe = onSnapshot(newOrdersQuery, (snapshot) => {
          // Verifica se existem pedidos pendentes
          const hasPendingOrders = !snapshot.empty;
          

          
          // Se há pedidos pendentes, ativa o monitoramento de inatividade
          if (hasPendingOrders) {
            this._inactivityMonitoringActive = true;
            this.registerOrderActivity(); // Registra atividade e inicia timer
          } else {
            this._inactivityMonitoringActive = false;
            this.lastOrderProcessedTime = null;
            if (this._inactivityTimer) {
              clearInterval(this._inactivityTimer);
              this._inactivityTimer = null;
            }
            return;
          }
          
          // Para cada novo pedido adicionado
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              // Obtém o timestamp do novo documento
              const doc = change.doc;
              const data = doc.data();
              let creationTime: Date | null = null;
              
              // Determina quando o pedido foi criado
              if (data.createdAt) {
                if (typeof data.createdAt === 'string') {
                  creationTime = new Date(data.createdAt);
                } else if (data.createdAt.toDate) {
                  creationTime = data.createdAt.toDate();
                } else if (data.createdAt.seconds) {
                  creationTime = new Date(data.createdAt.seconds * 1000);
                }
              }
              
              // Só registra atividade se for um pedido realmente novo
              // (criado após o último snapshot)
              if (creationTime && creationTime > lastSnapshotTime) {
                this.registerOrderActivity();
              }
            }
          });
          
          // Atualiza o timestamp do último snapshot
          lastSnapshotTime = new Date();
        }, (error) => {
          console.error('Erro ao monitorar novos pedidos:', error);
        });
        

      }).catch(error => {
        console.error('Erro ao verificar status da loja para monitoramento:', error);
      });
    } catch (error) {
      console.error('Erro ao iniciar monitoramento de pedidos:', error);
    }
  },
  
  // Variáveis para armazenar listeners e timers
  _autoStatusInterval: null as NodeJS.Timeout | null,
  _newOrdersUnsubscribe: null as (() => void) | null,
  
  // Para todos os timers e listeners (usar ao fazer logout)
  stopAllMonitoring() {
    console.log('🛑 Parando todo o monitoramento...');
    
    // Para o monitoramento de horário automático
    if (this._statusCheckInterval) {
      clearInterval(this._statusCheckInterval);
      this._statusCheckInterval = null;
      console.log('✅ Timer de verificação de status parado');
    }
    
    // Para a verificação de inatividade
    if (this._inactivityTimer) {
      clearInterval(this._inactivityTimer);
      this._inactivityTimer = null;
      console.log('✅ Timer de inatividade parado');
    }
    
    // Para o monitoramento de novos pedidos
    if (this._newOrdersUnsubscribe) {
      this._newOrdersUnsubscribe();
      this._newOrdersUnsubscribe = null;
      console.log('✅ Listener de pedidos parado');
    }
    
    // Reseta as flags de monitoramento
    this._inactivityMonitoringActive = false;
    this.lastOrderProcessedTime = null;
    
    console.log('✅ Todo o monitoramento foi parado');
  },

  // Função para debug - verifica pedidos pendentes manualmente
  async debugPendingOrders(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ Usuário não autenticado');
        return;
      }

      console.log('🔍 DEBUG: Verificando pedidos pendentes...');
      
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      const pendingOrdersQuery = query(
        ordersRef,
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingOrdersQuery);
      
      if (snapshot.empty) {
        console.log('✅ DEBUG: Nenhum pedido pendente encontrado');
        return;
      }

      console.log(`📋 DEBUG: Encontrados ${snapshot.size} pedido(s) pendente(s)`);
      const now = new Date();
      
             let hasInactiveOrderDebug = false;
       
       snapshot.docs.forEach((doc) => {
        const orderData = doc.data();
        console.log(`📄 DEBUG: Pedido ${doc.id}:`, {
          status: orderData.status,
          createdAt: orderData.createdAt,
          customerName: orderData.customerName || 'N/A',
          total: orderData.total || 'N/A'
        });
        
        // Conversão de data
        let orderCreatedAt: Date;
        if (orderData.createdAt?.toDate) {
          orderCreatedAt = orderData.createdAt.toDate();
        } else if (orderData.createdAt?.seconds) {
          orderCreatedAt = new Date(orderData.createdAt.seconds * 1000);
        } else if (typeof orderData.createdAt === 'string') {
          orderCreatedAt = new Date(orderData.createdAt);
        } else {
          orderCreatedAt = now;
        }
        
        const diffMinutes = Math.floor((now.getTime() - orderCreatedAt.getTime()) / (1000 * 60));
        console.log(`⏱️ DEBUG: Pedido ${doc.id} pendente há ${diffMinutes} minutos`);
        
        if (diffMinutes >= this.INACTIVITY_TIMEOUT_MINUTES) {
          console.log(`🚨 DEBUG: Pedido ${doc.id} ACIONARÁ CANCELAMENTO EM MASSA (${diffMinutes} >= ${this.INACTIVITY_TIMEOUT_MINUTES} minutos)`);
          hasInactiveOrderDebug = true;
        } else {
          console.log(`⏳ DEBUG: Pedido ${doc.id} ainda não atingiu o limite (${diffMinutes} < ${this.INACTIVITY_TIMEOUT_MINUTES} minutos)`);
        }
      });
      
      if (hasInactiveOrderDebug) {
        console.log(`🚨 DEBUG: TODOS os ${snapshot.size} pedidos serão cancelados por inatividade`);
      } else {
        console.log(`✅ DEBUG: Nenhum pedido será cancelado (nenhum atingiu ${this.INACTIVITY_TIMEOUT_MINUTES} minutos)`);
      }
      
      console.log(`🔧 DEBUG: Status do monitoramento:`);
      console.log(`- _inactivityMonitoringActive: ${this._inactivityMonitoringActive}`);
      console.log(`- _inactivityTimer exists: ${!!this._inactivityTimer}`);
      console.log(`- lastOrderProcessedTime: ${this.lastOrderProcessedTime}`);
      
      // Força verificação de inatividade
      console.log('🔄 DEBUG: Forçando verificação de inatividade...');
      await this.checkInactivity();
      
      console.log('📬 DEBUG: Verificando notificações criadas...');
      // Aguarda um pouco para dar tempo das notificações serem criadas
      setTimeout(async () => {
        try {
          const notifications = await notificationService.getNotifications();
          const inactivityNotifications = notifications.filter(n => 
            n.data?.reason === 'inactivity' || n.data?.reason === 'store_closed_inactivity'
          );
          console.log(`📬 DEBUG: ${inactivityNotifications.length} notificação(ões) de inatividade encontrada(s)`);
        } catch (error) {
          console.error('❌ DEBUG: Erro ao verificar notificações:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ DEBUG: Erro ao verificar pedidos pendentes:', error);
    }
  },

  // Função para limpeza manual completa - USE APENAS UMA VEZ
  async cleanupAllUnnecessaryFields(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        
        console.log('🧹 INICIANDO LIMPEZA COMPLETA...');
        console.log('📋 Campos antes da limpeza:', Object.keys(data));
        
        // Lista de campos desnecessários para remover
        const fieldsToRemove = [
          'establishmentStatus',
          'hasUnSettledFees', 
          'closedDueToInactivity',
          'inactivityMessage',
          'blockedSince', 
          'blockingReason',
          'manuallyClosedUntil',
          'lastUpdated' // Campo antigo
        ];
        
        const cleanupData: any = {};
        let fieldsRemoved = 0;
        
        // Remove apenas os campos que realmente existem
        fieldsToRemove.forEach(field => {
          if (data[field] !== undefined) {
            cleanupData[field] = deleteField();
            fieldsRemoved++;
            console.log(`🗑️ Removendo campo: ${field}`);
          }
        });
        
        // Preserva apenas os campos essenciais
        const essentialFields = {
          isOpen: data.isOpen || false,
          operationMode: data.operationMode || this.OPERATION_MODE.MANUAL,
          lastStatusChange: data.lastStatusChange || new Date().toISOString(),
          statusChangeReason: 'Documento limpo - apenas campos essenciais'
        };
        
        // Combina limpeza + campos essenciais
        const finalUpdateData = { ...cleanupData, ...essentialFields };
        
        if (fieldsRemoved > 0) {
          await updateDoc(partnerRef, finalUpdateData);
          console.log(`✅ LIMPEZA COMPLETA CONCLUÍDA - ${fieldsRemoved} campos removidos`);
          console.log('📋 Campos essenciais mantidos:', Object.keys(essentialFields));
        } else {
          console.log('✅ Documento já estava limpo');
        }
      }
    } catch (error) {
      console.error('❌ Erro na limpeza completa:', error);
      throw error;
    }
  }
}; 