import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Article } from '@store/slices/newsSlice';
import { formatDate } from '@utils/date';
import { truncate } from '@utils/string';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';
import { Typography } from '@utils/typography';

interface NewsCardProps {
  article: Article;
  onPress?: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID="news-card">
      {article.imageUrl && <Image source={{ uri: article.imageUrl }} style={styles.image} />}
      <View style={styles.content}>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.summary}>{truncate(article.summary, 140)}</Text>
        <Text style={styles.meta}>{formatDate(article.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border
  },
  image: {
    height: 160,
    width: '100%'
  },
  content: {
    padding: Spacing.md
  },
  title: {
    fontSize: Typography.subheading,
    color: Colors.text,
    fontWeight: '700'
  },
  summary: {
    marginTop: Spacing.sm,
    color: Colors.muted,
    fontSize: Typography.body
  },
  meta: {
    marginTop: Spacing.sm,
    color: Colors.muted,
    fontSize: Typography.small
  }
});

export default NewsCard;
