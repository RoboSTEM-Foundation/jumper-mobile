import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Platform,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Tv, Clock } from 'lucide-react-native';
import { Colors } from '../constants/colors';

export default function PlayerScreen() {
    const { sku, matchId, videoId, matchStarted } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [screenDim, setScreenDim] = useState(Dimensions.get('window'));
    const isLandscape = screenDim.width > screenDim.height;

    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setScreenDim(window);
        });
        return () => sub?.remove();
    }, []);

    const onStateChange = useCallback((state) => {
        if (state === 'ended') setPlaying(false);
    }, []);

    // Format match time for display
    const matchTime = matchStarted
        ? new Date(decodeURIComponent(matchStarted)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <SafeAreaView style={[styles.safeArea, isLandscape ? { paddingTop: 0 } : {}]} edges={isLandscape ? ['right', 'bottom', 'left'] : ['top', 'right', 'bottom', 'left']}>
            <StatusBar hidden={isLandscape} barStyle="light-content" backgroundColor={Colors.background} />

            {!isLandscape && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color={Colors.textMuted} size={22} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {matchId ? `Match #${matchId}` : 'Match Video'}
                    </Text>
                </View>
            )}

            <ScrollView
                style={[styles.scroll, isLandscape && { backgroundColor: '#000' }]}
                contentContainerStyle={isLandscape ? { flex: 1, padding: 0 } : styles.scrollContent}
                scrollEnabled={!isLandscape}
            >
                {/* Video Player */}
                {videoId ? (
                    <View style={[styles.playerWrapper, isLandscape && { height: screenDim.height, width: screenDim.width }]}>
                        <YoutubeIframe
                            height={isLandscape ? screenDim.height : 220}
                            width={isLandscape ? screenDim.width : screenDim.width}
                            play={playing}
                            videoId={videoId}
                            initialPlayerParams={{ rel: 0, modestbranding: 1 }}
                            onChangeState={onStateChange}
                        />
                    </View>
                ) : (
                    <View style={styles.noVideoCard}>
                        <Tv color={Colors.textDim} size={40} strokeWidth={1.2} />
                        <Text style={styles.noVideoTitle}>No Livestream Set</Text>
                        <Text style={styles.noVideoSub}>
                            Go back to the home screen and enter a Livestream URL first.
                        </Text>
                    </View>
                )}

                {/* Match Info */}
                {!isLandscape && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoSectionLabel}>MATCH INFO</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Event SKU</Text>
                            <Text style={styles.infoValue}>{sku || '—'}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Match ID</Text>
                            <Text style={styles.infoValue}>{matchId || '—'}</Text>
                        </View>

                        {matchTime && (
                            <View style={[styles.infoRow, styles.timeRow]}>
                                <Clock size={13} color={Colors.accentCyan} />
                                <Text style={styles.infoLabel}>Match Time</Text>
                                <Text style={[styles.infoValue, { color: Colors.accentCyan }]}>{matchTime}</Text>
                            </View>
                        )}

                        {!videoId && (
                            <View style={styles.hintBox}>
                                <Text style={styles.hintText}>
                                    💡 To watch a match, enter the YouTube livestream URL on the home screen before searching for an event.
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
        backgroundColor: Colors.cardBg,
        gap: 8,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    playerWrapper: {
        backgroundColor: '#000',
        width: '100%',
    },

    noVideoCard: {
        margin: 12,
        backgroundColor: Colors.cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
        gap: 14,
    },
    noVideoTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    noVideoSub: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },

    infoCard: {
        margin: 12,
        backgroundColor: Colors.cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: 16,
        gap: 12,
    },
    infoSectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.textMuted,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeRow: { gap: 6, justifyContent: 'flex-start' },
    infoLabel: { fontSize: 13, color: Colors.textMuted },
    infoValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

    hintBox: {
        backgroundColor: 'rgba(34,211,238,0.07)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.15)',
        padding: 12,
        marginTop: 4,
    },
    hintText: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
});
