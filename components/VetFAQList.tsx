import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { VET_FAQS, VET_FAQ_CATEGORIES, DISCLAIMER_TEXT, type VetFAQ } from '@/constants/vet-faqs';
import { usePremium } from '@/hooks/usePremium';

interface VetFAQListProps {
  onOpenPaywall?: () => void;
}

export function VetFAQList({ onOpenPaywall }: VetFAQListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isPremium, isLoading: premiumLoading } = usePremium();

  // Filter FAQs based on search query
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return VET_FAQS;
    const query = searchQuery.toLowerCase();
    return VET_FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group by category
  const faqsByCategory = useMemo(() => {
    const grouped: Record<string, VetFAQ[]> = {};
    filteredFaqs.forEach((faq) => {
      if (!grouped[faq.category]) {
        grouped[faq.category] = [];
      }
      grouped[faq.category].push(faq);
    });
    return grouped;
  }, [filteredFaqs]);

  // Disclaimer component
  const Disclaimer = () => (
    <View style={styles.disclaimerContainer}>
      <Ionicons name="warning-outline" size={20} color="#F59E0B" />
      <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
    </View>
  );

  // Premium gate overlay
  const renderPremiumGate = () => {
    if (premiumLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Verifica abbonamento...</Text>
        </View>
      );
    }

    if (isPremium) {
      return null; // Premium user - show content normally
    }

    // Free user - show blurred content + paywall CTA
    return (
      <View style={styles.premiumGateOverlay}>
        <BlurView intensity={80} tint="light" style={styles.blurBackground} />
        <View style={styles.paywallContent}>
          <Ionicons name="lock-closed" size={48} color="#10B981" />
          <Text style={styles.paywallTitle}>Contenuto Premium</Text>
          <Text style={styles.paywallDescription}>
            Accedi a tutti i consigli del veterinario per passeggiate sicure e salutari con il tuo cane.
          </Text>
          <TouchableOpacity 
            style={styles.paywallButton}
            onPress={onOpenPaywall}
          >
            <Text style={styles.paywallButtonText}>Scopri i piani Premium</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // FAQ Item component
  const renderFAQItem = (faq: VetFAQ, isBlurred: boolean) => {
    const isExpanded = expandedId === faq.id;

    return (
      <TouchableOpacity
        key={faq.id}
        style={styles.faqItem}
        onPress={() => setExpandedId(isExpanded ? null : faq.id)}
        disabled={isBlurred || premiumLoading}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContainer}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </View>
        
        {isExpanded && (
          <View style={styles.faqAnswerContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {VET_FAQ_CATEGORIES[faq.category]}
              </Text>
            </View>
            {isBlurred ? (
              <Text style={styles.faqAnswerBlurred}>
                Contetto disponibile solo per utenti Premium...
              </Text>
            ) : (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Category section
  const renderCategory = (category: string, faqs: VetFAQ[], isBlurred: boolean) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>
        {VET_FAQ_CATEGORIES[category as keyof typeof VET_FAQ_CATEGORIES]}
      </Text>
      {faqs.map((faq) => renderFAQItem(faq, isBlurred))}
    </View>
  );

  const isBlurred = !isPremium && !premiumLoading;

  return (
    <View style={styles.container}>
      {/* Disclaimer at top */}
      <Disclaimer />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca un argomento..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!premiumLoading}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* FAQ List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(faqsByCategory).map(([category, faqs]) =>
          renderCategory(category, faqs, isBlurred)
        )}

        {filteredFaqs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nessun risultato trovato</Text>
          </View>
        )}

        {/* Spacing for paywall overlay */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Disclaimer at bottom */}
      <View style={styles.bottomDisclaimer}>
        <Disclaimer />
      </View>

      {/* Premium gate overlay */}
      {renderPremiumGate()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingRight: 8,
  },
  faqAnswerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    paddingTop: 12,
  },
  categoryBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  faqAnswerBlurred: {
    fontSize: 14,
    lineHeight: 22,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  bottomDisclaimer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 100,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  premiumGateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  paywallContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  paywallDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 320,
  },
  paywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  paywallButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});