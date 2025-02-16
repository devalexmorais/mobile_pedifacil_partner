import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  orderNumber: string;
  items: string[];
  response?: string;
}

const reviews: Review[] = [
  {
    id: '1',
    userName: 'João Silva',
    rating: 5,
    comment: 'Comida excelente! Entrega rápida e tudo muito bem embalado. Com certeza pedirei novamente.',
    date: '15/03/2024',
    orderNumber: '#12345',
    items: ['X-Tudo', 'Batata Frita', 'Refrigerante'],
  },
  {
    id: '2',
    userName: 'Maria Santos',
    rating: 4,
    comment: 'Muito bom, mas demorou um pouco mais que o previsto.',
    date: '14/03/2024',
    orderNumber: '#12344',
    items: ['Pizza Grande', 'Refrigerante'],
    response: 'Olá Maria, agradecemos seu feedback! Estamos trabalhando para melhorar nosso tempo de entrega.',
  },
  {
    id: '3',
    userName: 'Pedro Costa',
    rating: 3,
    comment: 'A comida estava boa, mas chegou fria.',
    date: '13/03/2024',
    orderNumber: '#12343',
    items: ['Yakisoba', 'Rolinho Primavera'],
  },
];

export default function Avaliacao() {
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  const totalReviews = reviews.length;

  const getRatingCount = (rating: number) => {
    return reviews.filter(review => review.rating === rating).length;
  };

  const getRatingPercentage = (rating: number) => {
    return (getRatingCount(rating) / totalReviews) * 100;
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

  return (
    <View style={styles.container}>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Resumo das Avaliações */}
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

        {/* Lista de Avaliações */}
        <View style={styles.reviewsContainer}>
          <Text style={styles.sectionTitle}>Últimas Avaliações</Text>

          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.userName}>{review.userName}</Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(review.rating)}
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
                <Text style={styles.orderNumber}>{review.orderNumber}</Text>
              </View>

              <Text style={styles.items}>
                {review.items.join(' • ')}
              </Text>

              <Text style={styles.comment}>{review.comment}</Text>

              {review.response && (
                <View style={styles.responseContainer}>
                  <View style={styles.responseHeader}>
                    <Ionicons name="chatbubble-ellipses" size={16} color={colors.green[600]} />
                    <Text style={styles.responseLabel}>Sua resposta</Text>
                  </View>
                  <Text style={styles.responseText}>{review.response}</Text>
                </View>
              )}

              {!review.response && (
                <TouchableOpacity style={styles.replyButton}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.purple[500]} />
                  <Text style={styles.replyButtonText}>Responder avaliação</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
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
  userName: {
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
  orderNumber: {
    fontSize: 12,
    color: colors.gray[500],
    fontWeight: '500',
  },
  items: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
  },
  comment: {
    fontSize: 14,
    color: colors.gray[800],
    lineHeight: 20,
    marginBottom: 16,
  },
  responseContainer: {
    backgroundColor: colors.green[50],
    borderRadius: 8,
    padding: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green[600],
  },
  responseText: {
    fontSize: 14,
    color: colors.gray[800],
    lineHeight: 20,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  replyButtonText: {
    fontSize: 14,
    color: colors.purple[500],
    fontWeight: '500',
  },
}); 