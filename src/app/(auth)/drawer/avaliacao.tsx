import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { AvaliacaoSkeleton } from '@/components/skeleton';

interface Review {
  id: string;
  comment: string;
  createdAt: Date;
  orderId: string;
  rating: number;
  userId: string;
}

export default function Avaliacao() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        const ordersRef = collection(db, 'partners', user.uid, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);

        const reviewsData: Review[] = [];

        for (const orderDoc of ordersSnapshot.docs) {
          const reviewRef = collection(db, 'partners', user.uid, 'orders', orderDoc.id, 'review');
          const reviewSnapshot = await getDocs(reviewRef);

          reviewSnapshot.forEach((reviewDoc) => {
            const data = reviewDoc.data();
            reviewsData.push({
              id: reviewDoc.id,
              comment: data.comment || '',
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              orderId: data.orderId || orderDoc.id,
              rating: data.rating || 0,
              userId: data.userId || user.uid,
            });
          });
        }

        setReviews(reviewsData);
      } catch (error: unknown) {
        console.error('Erro detalhado ao buscar avaliações:', error);
        if (error instanceof Error) {
          setError('Erro ao carregar avaliações: ' + error.message);
        } else {
          setError('Erro ao carregar avaliações');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  const totalReviews = reviews.length;

  const getRatingCount = (rating: number) => {
    return reviews.filter(review => review.rating === rating).length;
  };

  const getRatingPercentage = (rating: number) => {
    return totalReviews > 0 ? (getRatingCount(rating) / totalReviews) * 100 : 0;
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={16}
        color={colors.yellow[500]}
      />
    ));
  };

  if (loading) {
    return <AvaliacaoSkeleton />;
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.averageContainer}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {renderStars(Math.round(averageRating))}
            </View>
            <Text style={styles.totalReviews}>
              {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
            </Text>
          </View>

          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={rating} style={styles.ratingBar}>
                <Text style={styles.ratingNumber}>{rating}</Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.barFill, 
                      { width: `${getRatingPercentage(rating)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.ratingCount}>
                  {getRatingCount(rating)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.reviewsContainer}>
          <Text style={styles.sectionTitle}>Últimas Avaliações</Text>
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Ainda não há avaliações para mostrar
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.orderNumber}>Pedido #{review.orderId}</Text>
                    <View style={styles.ratingContainer}>
                      {renderStars(review.rating)}
                      <Text style={styles.reviewDate}>
                        {review.createdAt.toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                </View>
                {review.comment && <Text style={styles.comment}>{review.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Estilos permanecem iguais
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.red[500],
    fontSize: 16,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: colors.white,
    padding: 24,
    marginBottom: 12,
  },
  averageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: colors.gray[600],
  },
  ratingBars: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    width: 16,
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.yellow[500],
  },
  ratingCount: {
    width: 32,
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'right',
  },
  reviewsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.gray[500],
  },
  comment: {
    fontSize: 14,
    color: colors.gray[800],
    lineHeight: 20,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
  },
});