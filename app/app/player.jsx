import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useIsFocused } from '@react-navigation/native';
import { ChevronLeft, Tv, Clock } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { consumeRotateFullscreenHintQuota } from '../services/fullscreenHint';

export default function PlayerScreen() {
    const { sku, matchId, videoId, matchStarted } = useLocalSearchParams();
    const router = useRouter();
    const isFocused = useIsFocused();
    const [screenDim, setScreenDim] = useState(Dimensions.get('window'));
    const isLandscape = screenDim.width > screenDim.height;
    const landscapeViewportWidth = screenDim.width;
    const landscapeViewportHeight = screenDim.height;
    const landscapeIsWide = (landscapeViewportWidth / landscapeViewportHeight) > (16 / 9);
    const landscapePlayerWidth = landscapeIsWide
        ? Math.round(landscapeViewportHeight * (16 / 9))
        : landscapeViewportWidth;
    const landscapePlayerHeight = landscapeIsWide
        ? landscapeViewportHeight
        : Math.round(landscapeViewportWidth * (9 / 16));

    const [playing, setPlaying] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const playerRef = useRef(null);
    const fullscreenRef = useRef(false);
    fullscreenRef.current = fullscreen;
    const lastFsRequestTsRef = useRef(0);
    const [rotateFsHintVisible, setRotateFsHintVisible] = useState(false);
    const rotateFsHintTimerRef = useRef(null);
    const hideRotateFsHint = useCallback(() => {
        if (rotateFsHintTimerRef.current) {
            clearTimeout(rotateFsHintTimerRef.current);
            rotateFsHintTimerRef.current = null;
        }
        setRotateFsHintVisible(false);
    }, []);
    const showRotateFsHint = useCallback(async () => {
        const canShow = await consumeRotateFullscreenHintQuota();
        if (!canShow) return;
        if (rotateFsHintTimerRef.current) clearTimeout(rotateFsHintTimerRef.current);
        setRotateFsHintVisible(true);
        rotateFsHintTimerRef.current = setTimeout(() => {
            rotateFsHintTimerRef.current = null;
            setRotateFsHintVisible(false);
        }, 5000);
    }, []);

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setScreenDim(window);
        });

        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        return () => {
            sub?.remove();
            ScreenOrientation.unlockAsync();
            if (rotateFsHintTimerRef.current) clearTimeout(rotateFsHintTimerRef.current);
        };
    }, []);
    useEffect(() => {
        if (!isFocused) hideRotateFsHint();
    }, [hideRotateFsHint, isFocused]);

    const requestNativeFullscreen = useCallback(() => {
        const player = playerRef.current;
        if (!player || typeof player.injectJavaScript !== 'function') return;

        player.injectJavaScript(`
            (function () {
                try {
                    if (!player || typeof player.getIframe !== 'function') return true;
                    var iframe = player.getIframe();
                    if (!iframe) return true;

                    var requestFs = iframe.requestFullscreen
                        || iframe.webkitRequestFullscreen
                        || iframe.mozRequestFullScreen
                        || iframe.msRequestFullscreen;

                    if (requestFs) {
                        requestFs.call(iframe);
                    } else if (typeof iframe.webkitEnterFullscreen === 'function') {
                        iframe.webkitEnterFullscreen();
                    } else if (typeof iframe.webkitEnterFullScreen === 'function') {
                        iframe.webkitEnterFullScreen();
                    }
                } catch (e) {}
                return true;
            })();
            true;
        `);
    }, []);

    useEffect(() => {
        if (!videoId || !isFocused) return;

        ScreenOrientation.unlockAsync();

        const orientSub = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
            const isLand = [
                ScreenOrientation.Orientation.LANDSCAPE_LEFT,
                ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
            ].includes(orientationInfo.orientation);
            const isPortrait = [
                ScreenOrientation.Orientation.PORTRAIT_UP,
                ScreenOrientation.Orientation.PORTRAIT_DOWN,
            ].includes(orientationInfo.orientation);

            if (isLand && !fullscreenRef.current) {
                const now = Date.now();
                if (now - lastFsRequestTsRef.current < 900) return;
                lastFsRequestTsRef.current = now;
                void showRotateFsHint();
                requestNativeFullscreen();
                setTimeout(requestNativeFullscreen, 320);
            } else if (isPortrait) {
                hideRotateFsHint();
            }
        });

        return () => {
            ScreenOrientation.removeOrientationChangeListener(orientSub);
            if (!fullscreenRef.current) {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
    }, [hideRotateFsHint, isFocused, requestNativeFullscreen, showRotateFsHint, videoId]);

    const handleFullScreenChange = useCallback(async (isFull) => {
        console.log('[Player Fullscreen]', isFull ? 'ENTERED' : 'EXITED');
        setFullscreen(isFull);
        StatusBar.setHidden(isFull, 'fade');
        if (isFull) {
            await ScreenOrientation.unlockAsync();
        } else {
            hideRotateFsHint();
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, [hideRotateFsHint]);

    const onStateChange = useCallback((state) => {
        if (state === 'ended') setPlaying(false);
    }, []);

    // Format match time for display
    const matchTime = matchStarted
        ? new Date(decodeURIComponent(matchStarted)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <>
            <SafeAreaView style={[styles.safeArea, isLandscape ? { paddingTop: 0 } : {}]} edges={isLandscape ? ['right', 'left'] : ['top', 'right', 'bottom', 'left']}>
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
                    bounces={!isLandscape}
                    contentInsetAdjustmentBehavior={isLandscape ? 'never' : 'automatic'}
                >
                    {/* Video Player */}
                    {videoId ? (
                        <View style={[
                            styles.playerWrapper,
                            isLandscape && { height: landscapeViewportHeight, width: landscapeViewportWidth, alignItems: 'center', justifyContent: 'center' },
                        ]}>
                            <YoutubeIframe
                                ref={playerRef}
                                height={isLandscape ? landscapePlayerHeight : 220}
                                width={isLandscape ? landscapePlayerWidth : screenDim.width}
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

                {rotateFsHintVisible && (
                    <View pointerEvents="box-none" style={styles.rotateFsHintContainer}>
                        <View style={styles.rotateFsHintBubble}>
                            <Text style={styles.rotateFsHintText}>Turn your phone back to exit fullscreen.</Text>
                            <TouchableOpacity onPress={hideRotateFsHint} style={styles.rotateFsHintClose} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Text style={styles.rotateFsHintCloseText}>X</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.background },
    rotateFsHintContainer: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 20,
    },
    rotateFsHintBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '92%',
        backgroundColor: 'rgba(15,23,42,0.86)',
        borderRadius: 11,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 13,
        paddingVertical: 9,
    },
    rotateFsHintText: { color: '#f9fafb', fontSize: 13, fontWeight: '700' },
    rotateFsHintClose: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    rotateFsHintCloseText: { color: '#e5e7eb', fontSize: 11, fontWeight: '800' },

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
