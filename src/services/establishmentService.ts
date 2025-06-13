import { doc, updateDoc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { establishmentSettingsService, Schedule } from './establishmentSettingsService';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
        // Se a loja está aberta manualmente, retorna true
        if (data.isOpen === true && !data.closedDueToInactivity) {
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
        return {
          isOpen: data.isOpen || false,
          operationMode: data.operationMode || this.OPERATION_MODE.MANUAL,
          lastStatusChange: data.lastStatusChange || new Date().toISOString(),
          statusChangeReason: data.statusChangeReason || 'Status inicial'
        };
      }

      // Se não existir, cria com status padrão
      const defaultStatus = {
        isOpen: false,
        operationMode: this.OPERATION_MODE.MANUAL,
        lastStatusChange: new Date().toISOString(),
        statusChangeReason: 'Status inicial'
      };

      await setDoc(partnerRef, defaultStatus);
      return defaultStatus;
    } catch (error) {
      console.error('Erro ao obter status do estabelecimento:', error);
      throw error;
    }
  },

  // Método para registrar a última atividade de pedido
  registerOrderActivity() {
    // Se a loja estiver fechada, não devemos registrar atividade
    this.getEstablishmentStatus().then(isOpen => {
      if (!isOpen) {
        console.log("Loja está fechada, ignorando registro de atividade");
        return;
      }
      
      const now = new Date();
      this.lastOrderProcessedTime = now;
      console.log(`Atividade de pedido registrada às ${now.toLocaleTimeString()}, resetando temporizador de inatividade`);
      
      // Ativa o monitoramento de inatividade se for o primeiro pedido
      this._inactivityMonitoringActive = true;
      
      // Reinicia a verificação de inatividade
      this.startInactivityCheck();
    }).catch(error => {
      console.error("Erro ao verificar status da loja:", error);
    });
  },
  
  // Inicia a verificação de inatividade
  startInactivityCheck() {
    // Se não há monitoramento ativo, não inicia o timer
    if (!this._inactivityMonitoringActive) {
      console.log("Monitoramento de inatividade não iniciado - aguardando primeiro pedido");
      return;
    }
    
    // Limpa qualquer temporizador existente
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = null;
    }
    
    // Define um novo temporizador - verifica a cada minuto
    this._inactivityTimer = setInterval(async () => {
      try {
        await this.checkInactivity();
      } catch (error) {
        console.error('Erro ao verificar inatividade:', error);
      }
    }, 60000); // Verifica a cada minuto
    
    console.log("Temporizador de inatividade iniciado - próxima verificação em 1 minuto");
  },
  
  // Verifica se houve inatividade por tempo suficiente para fechar a loja
  async checkInactivity() {
    try {
      console.log("Iniciando verificação de inatividade");
      
      const user = auth.currentUser;
      if (!user) {
        console.log("Usuário não autenticado, parando verificações de inatividade");
        return;
      }

      // Verifica se existem pedidos pendentes
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      const pendingOrdersQuery = query(
        ordersRef,
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingOrdersQuery);
      
      if (!snapshot.empty) {
        const now = new Date();
        
        // Para cada pedido pendente, verifica o tempo de inatividade
        for (const doc of snapshot.docs) {
          const orderData = doc.data();
          const orderCreatedAt = orderData.createdAt?.toDate?.() || new Date(orderData.createdAt);
          
          const diffMinutes = Math.floor((now.getTime() - orderCreatedAt.getTime()) / (1000 * 60));
          console.log(`Pedido ${doc.id} está pendente há ${diffMinutes} minutos`);
          
          // Se o pedido está pendente há mais de 15 minutos, cancela automaticamente
          if (diffMinutes >= this.INACTIVITY_TIMEOUT_MINUTES) {
            console.log(`Cancelando pedido ${doc.id} por inatividade`);
            await updateDoc(doc.ref, {
              status: 'canceled',
              canceledAt: new Date().toISOString(),
              cancelReason: 'Pedido cancelado automaticamente por inatividade após 15 minutos'
            });
          }
        }
      }
      
      // Verifica se ainda existem pedidos pendentes após o cancelamento automático
      const updatedSnapshot = await getDocs(pendingOrdersQuery);
      
      // Se não houver mais pedidos pendentes, fecha a loja
      if (updatedSnapshot.empty) {
        const partnerRef = doc(db, 'partners', user.uid);
        await updateDoc(partnerRef, {
          isOpen: false,
          closedDueToInactivity: true,
          inactivityMessage: "Loja fechada automaticamente por inatividade"
        });
        
        console.log("Loja fechada automaticamente por inatividade");
        
        // Desativa o monitoramento de inatividade
        this._inactivityMonitoringActive = false;
        this.lastOrderProcessedTime = null;
        
        if (this._inactivityTimer) {
          clearTimeout(this._inactivityTimer);
          this._inactivityTimer = null;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar inatividade:', error);
    }
  },
  
  // Verifica se a loja está aberta
  async isStoreOpen(userId: string): Promise<boolean> {
    try {
      const partnerRef = doc(db, 'partners', userId);
      const partnerDoc = await getDoc(partnerRef);
      
      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return data.isOpen === true;  // Simplificado para apenas verificar isOpen
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

      console.log('🔒 Tentando alterar status do estabelecimento:', isOpen ? 'ABRIR' : 'FECHAR');

      // Se estiver tentando abrir, primeiro verifica se pode via Cloud Function
      if (isOpen) {
        const functions = getFunctions();
        const verificarPermissao = httpsCallable(functions, 'verificarPermissaoAbertura');
        
        try {
          const result = await verificarPermissao();
          const data = result.data as any;
          
          if (!data.canOpen) {
            console.log('🔒 ❌ ABERTURA NEGADA pelo backend:', data.reason);
            throw new Error(data.reason || 'Estabelecimento não pode ser aberto devido a pendências de pagamento');
          }
          
          console.log('🔒 ✅ ABERTURA PERMITIDA pelo backend');
        } catch (cloudError: any) {
          console.error('🔒 ❌ ERRO na verificação de permissão:', cloudError);
          
          // Se é erro de permissão, repassa a mensagem
          if (cloudError.code === 'functions/permission-denied') {
            throw new Error(cloudError.message);
          }
          
          // Para outros erros, permite continuar (fail-safe)
          console.warn('🔒 ⚠️ Erro na Cloud Function, continuando com verificação local...');
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
      const atualizarStatus = httpsCallable(functions, 'atualizarStatusEstabelecimento');
      
      try {
        const result = await atualizarStatus({
          isOpen,
          reason: isOpen 
            ? 'Aberto manualmente pelo usuário'
            : 'Fechado manualmente pelo usuário'
        });
        
        const data = result.data as any;
        console.log('🔒 ✅ Status atualizado via Cloud Function:', data.message);
        
      } catch (cloudError: any) {
        console.error('🔒 ❌ ERRO na Cloud Function de atualização:', cloudError);
        
        // Se é erro de permissão, repassa a mensagem
        if (cloudError.code === 'functions/permission-denied') {
          throw new Error(cloudError.message);
        }
        
        // Para outros erros, tenta atualização local como fallback
        console.warn('🔒 ⚠️ Erro na Cloud Function, tentando atualização local...');
        
        const partnerRef = doc(db, 'partners', user.uid);
        await updateDoc(partnerRef, {
          'establishmentStatus.isOpen': isOpen,
          'establishmentStatus.operationMode': this.OPERATION_MODE.MANUAL,
          'establishmentStatus.lastStatusChange': new Date().toISOString(),
          'establishmentStatus.statusChangeReason': isOpen 
            ? 'Aberto manualmente pelo usuário (fallback)'
            : 'Fechado manualmente pelo usuário (fallback)'
        });
      }

      console.log(`🔒 Estabelecimento ${isOpen ? 'aberto' : 'fechado'} com sucesso`);
    } catch (error) {
      console.error('🔒 ❌ Erro ao alternar status do estabelecimento:', error);
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

      // Se mudou para automático, verifica o status imediatamente
      if (mode === this.OPERATION_MODE.AUTOMATIC) {
        await this.checkAndUpdateStatus();
      }
    } catch (error) {
      console.error('Erro ao alternar modo de operação:', error);
      throw error;
    }
  },

  // Inicia a verificação automática de status
  startAutoStatusCheck(): void {
    // Limpa intervalo existente
    if (this._statusCheckInterval) {
      clearInterval(this._statusCheckInterval);
    }

    // Verifica a cada 5 minutos ao invés de 1 minuto
    this._statusCheckInterval = setInterval(async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const partnerRef = doc(db, 'partners', user.uid);
        const partnerDoc = await getDoc(partnerRef);
        
        if (!partnerDoc.exists()) return;

        const data = partnerDoc.data();
        
        // Se estiver no modo manual, não faz nada
        if (data.operationMode === this.OPERATION_MODE.MANUAL) {
          console.log('Modo manual ativo - status não será alterado automaticamente');
          return;
        }

        // Verifica se a loja está aberta manualmente
        if (data.isOpen && data.lastStatusChange && data.statusChangeReason?.includes('manualmente')) {
          console.log('Loja aberta manualmente, ignorando verificação automática');
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
            console.log('Loja fechada automaticamente - fora do horário de funcionamento');
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
          console.log(`Status atualizado automaticamente: isOpen=${shouldBeOpen}`);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos
  },

  // Para a verificação automática
  stopAutoStatusCheck(): void {
    if (this._statusCheckInterval) {
      clearInterval(this._statusCheckInterval);
      this._statusCheckInterval = null;
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
            console.log('Loja fechada, parando monitoramento de pedidos');
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
          
          // Se não houver pedidos pendentes, desativa o monitoramento de inatividade
          if (!hasPendingOrders) {
            console.log('Nenhum pedido pendente, desativando monitoramento de inatividade');
            this._inactivityMonitoringActive = false;
            this.lastOrderProcessedTime = null;
            if (this._inactivityTimer) {
              clearTimeout(this._inactivityTimer);
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
                console.log('Novo pedido detectado, atualizando atividade da loja');
              } else {
                console.log('Pedido pendente existente detectado, ignorando para inatividade');
              }
            }
          });
          
          // Atualiza o timestamp do último snapshot
          lastSnapshotTime = new Date();
        }, (error) => {
          console.error('Erro ao monitorar novos pedidos:', error);
        });
        
        console.log('Monitoramento de novos pedidos iniciado - loja aberta');
      }).catch(error => {
        console.error('Erro ao verificar status da loja para monitoramento:', error);
      });
    } catch (error) {
      console.error('Erro ao iniciar monitoramento de pedidos:', error);
    }
  },
  
  // Variáveis para armazenar listeners e timers
  _autoStatusInterval: null as NodeJS.Timeout | null,
  _inactivityTimer: null as NodeJS.Timeout | null,
  _newOrdersUnsubscribe: null as (() => void) | null,
  
  // Para todos os timers e listeners (usar ao fazer logout)
  stopAllMonitoring() {
    // Para o monitoramento de horário automático
    if (this._autoStatusInterval) {
      clearInterval(this._autoStatusInterval);
      this._autoStatusInterval = null;
    }
    
    // Para a verificação de inatividade
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = null;
    }
    
    // Para o monitoramento de novos pedidos
    if (this._newOrdersUnsubscribe) {
      this._newOrdersUnsubscribe();
      this._newOrdersUnsubscribe = null;
    }
    
    // Reseta a flag de monitoramento
    this._inactivityMonitoringActive = false;
    
    console.log('Todo o monitoramento foi parado');
  }
}; 