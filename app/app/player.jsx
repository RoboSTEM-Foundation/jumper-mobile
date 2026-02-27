import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
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
    const [fullscreen, setFullscreen] = useState(false);
    const playerRef = useRef(null);
    const fullscreenRef = useRef(false);
    fullscreenRef.current = fullscreen;

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setScreenDim(window);
        });

        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        return () => {
            sub?.remove();
            ScreenOrientation.unlockAsync();
        };
    }, []);

    // Auto-fullscreen: show native iOS player when rotating to landscape
    const [showNativeFS, setShowNativeFS] = useState(false);
    const nativeFSTimeRef = useRef(0);
    const showNativeFSRef = useRef(false);
    showNativeFSRef.current = showNativeFS;

    useEffect(() => {
        if (!videoId) return;

        ScreenOrientation.unlockAsync();

        const orientSub = ScreenOrientation.addOrientationChangeListener(async ({ orientationInfo }) => {
            const isLand = [
                ScreenOrientation.Orientation.LANDSCAPE_LEFT,
                ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
            ].includes(orientationInfo.orientation);

            if (isLand && !fullscreenRef.current && !showNativeFSRef.current) {
                try {
                    const t = playerRef.current ? await playerRef.current.getCurrentTime() : 0;
                    nativeFSTimeRef.current = Math.floor(t);
                } catch { nativeFSTimeRef.current = 0; }
                setShowNativeFS(true);
            }
        });

        return () => {
            ScreenOrientation.removeOrientationChangeListener(orientSub);
            if (!fullscreenRef.current) {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
    }, [videoId]);

    // Dismiss native fullscreen overlay when rotating back to portrait
    useEffect(() => {
        if (showNativeFS && !isLandscape) {
            setShowNativeFS(false);
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, [isLandscape, showNativeFS]);

    const handleFullScreenChange = useCallback(async (isFull) => {
        console.log('[Player Fullscreen]', isFull ? 'ENTERED' : 'EXITED');
        setFullscreen(isFull);
        StatusBar.setHidden(isFull, 'fade');
        if (isFull) {
            await ScreenOrientation.unlockAsync();
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, []);

    const onStateChange = useCallback((state) => {
        if (state === 'ended') setPlaying(false);
    }, []);

    // Format match time for display
    const matchTime = matchStarted
        ? new Date(decodeURIComponent(matchStarted)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <>
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
                                ref={playerRef}
                                height={isLandscape ? screenDim.height : 220}
                                width={isLandscape ? screenDim.width : screenDim.width}
                                play={playing}
                                videoId={videoId}
                                initialPlayerParams={{ rel: 0, modestbranding: 1 }}
                                onChangeState={onStateChange}
                                onFullScreenChange={handleFullScreenChange}
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

            {/* Native Fullscreen Overlay */}
            {showNativeFS && videoId && (
                <Modal visible animationType="none" supportedOrientations={['landscape']}>
                    <View style={{ flex: 1, backgroundColor: '#000' }}>
                        <WebView
                            source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${nativeFSTimeRef.current}&playsinline=0&rel=0&modestbranding=1` }}
                            allowsInlineMediaPlayback={false}
                            allowsFullscreenVideo={true}
                            mediaPlaybackRequiresUserAction={false}
                            style={{ flex: 1 }}
                        />
                    </View>
                </Modal>
            )}
        </>
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
