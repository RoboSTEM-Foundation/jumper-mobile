import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Dimensions,
    StatusBar,
    Image,
    Animated,
    PanResponder,
    ActivityIndicator,

} from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';
import {
    Tv,
    Link,
    Star,
    ChevronDown,
    ChevronUp,
    Search,
    History,
    Settings,
    GitBranch,
    RotateCcw,
    // Users,   // ← Search by Team icon (commented out with its section)
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { extractVideoId, fetchStreamStartTime } from '../services/youtube';
import { getEventBySku } from '../services/robotevents';
import EventView from '../components/EventView';

const { width, height } = Dimensions.get('window');

const LOGO = require('../assets/images/logo.png');
const SHEET_FULL = height * 0.72;   // fully open
const SHEET_COLLAPSED = 52;              // minimised strip height

// ── Featured Events Dropdown ──────────────────────────────────
const FEATURED_EVENTS = [
    { label: 'Select an event...', value: '' },
    { label: 'VEX Worlds 2025 – Dallas', value: 'RE-VRC-25-3690' },
    { label: 'VEX State Championship – CA', value: 'RE-VRC-25-1122' },
    { label: 'VEX Regionals – PNW', value: 'RE-VRC-25-0985' },
];

// ── Section Card ──────────────────────────────────────────────
function SectionCard({ children, style }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

// ── Bottom Tab Button ─────────────────────────────────────────
function TabButton({ icon, active, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            activeOpacity={0.7}
        >
            {icon}
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
    // ── Livestream / Player ──
    const playerRef = useRef(null);
    const [videoId, setVideoId] = useState(null);
    const [livestreamUrl, setLivestreamUrl] = useState('');
    const [playing, setPlaying] = useState(false);
    const [streamStartTime, setStreamStartTime] = useState(null); // epoch ms from YouTube API

    // ── Event detection ──
    const [event, setEvent] = useState(null);
    const [eventLoading, setEventLoading] = useState(false);

    // ── Find Event UI ──
    const [eventUrl, setEventUrl] = useState('');
    const [findEventOpen, setFindEventOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(FEATURED_EVENTS[0]);
    const [activeNavTab, setActiveNavTab] = useState('history');

    // ── Bottom sheet animation ──
    const sheetAnim = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
    const sheetValRef = useRef(SHEET_COLLAPSED);
    const [sheetVisible, setSheetVisible] = useState(false);  // any state shown

    // Listen so we always know the current value
    sheetAnim.addListener(({ value }) => { sheetValRef.current = value; });

    const openSheet = useCallback(() => {
        setSheetVisible(true);
        Animated.spring(sheetAnim, {
            toValue: SHEET_FULL,
            useNativeDriver: false,
            bounciness: 4,
        }).start();
    }, [sheetAnim]);

    const minimiseSheet = useCallback(() => {
        Animated.spring(sheetAnim, {
            toValue: SHEET_COLLAPSED,
            useNativeDriver: false,
            bounciness: 4,
        }).start();
    }, [sheetAnim]);

    // PanResponder – drag the handle bar
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
            onPanResponderMove: (_, g) => {
                const next = Math.max(SHEET_COLLAPSED,
                    Math.min(SHEET_FULL, sheetValRef.current - g.dy));
                sheetAnim.setValue(next);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 60) minimiseSheet();
                else openSheet();
            },
        })
    ).current;

    // ── Load event by SKU ──
    const loadEvent = useCallback(async (sku) => {
        if (!sku) return;
        setEventLoading(true);
        try {
            const ev = await getEventBySku(sku);
            setEvent(ev);
            openSheet();
        } catch (e) {
            Alert.alert('Event not found', e.message);
        } finally {
            setEventLoading(false);
        }
    }, [openSheet]);

    // ── Livestream URL changed ──
    const handleLivestreamUrlChange = (url) => {
        setLivestreamUrl(url);
        const id = extractVideoId(url);
        setVideoId(id);
        setPlaying(false);
        setStreamStartTime(null);

        if (id) {
            // Fetch stream start time via YouTube API v3
            fetchStreamStartTime(id).then(t => {
                if (t) setStreamStartTime(t);
            });
        }

        // Auto-detect RobotEvents event URL pasted into the livestream field
        const skuMatch = url.match(/(RE-[A-Z0-9]+-\d{2}-\d{4})/);
        if (skuMatch) loadEvent(skuMatch[1]);
    };

    // ── Search by Event URL ──
    const handleSearchByUrl = () => {
        if (!eventUrl.trim()) return;
        const skuMatch = eventUrl.match(/(RE-[A-Z0-9]+-\d{2}-\d{4})/);
        if (skuMatch) {
            loadEvent(skuMatch[1]);
        } else {
            Alert.alert('Invalid URL', 'Could not find a RobotEvents SKU in the URL.');
        }
    };

    // ── Featured event selected ──
    const handleFeaturedSelect = (ev) => {
        setSelectedEvent(ev);
        setDropdownOpen(false);
        if (ev.value) loadEvent(ev.value);
    };

    // ── Watch match → seek player ──
    const handleWatch = useCallback((match) => {
        if (!videoId) {
            console.warn('[Watch] No livestream URL set.');
            return;
        }

        const time = match.started || match.scheduled;
        const startSec = (streamStartTime && time)
            ? Math.max(0, (new Date(time).getTime() - streamStartTime) / 1000)
            : null;

        // 1. Start playing + collapse sheet so the player is visible
        setPlaying(true);
        minimiseSheet();

        // 2. Wait for the player to actually be in 'playing' state, THEN seek.
        //    Seeking before play() is called causes the position to reset back to 0.
        if (startSec !== null) {
            setTimeout(() => {
                playerRef.current?.seekTo(startSec, true);
            }, 500);
        }
    }, [streamStartTime, videoId, minimiseSheet]);



    // ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <Image source={LOGO} style={{ width: width - 32, height: 48 }} resizeMode="contain" />
            </View>

            {/* ── Main Scroll ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Player / Placeholder ── */}
                <SectionCard style={styles.playerCard}>
                    {videoId ? (
                        <YoutubeIframe
                            ref={playerRef}
                            height={200}
                            videoId={videoId}
                            play={playing}
                            onChangeState={(state) => {
                                if (state === 'ended') setPlaying(false);
                                if (state === 'playing') setPlaying(true);
                            }}
                            initialPlayerParams={{ rel: 0, modestbranding: 1 }}
                        />
                    ) : (
                        <View style={styles.playerPlaceholder}>
                            <Tv color={Colors.textDim} size={36} strokeWidth={1.2} />
                            <Text style={styles.playerPlaceholderText}>
                                Load an event first to watch streams
                            </Text>
                        </View>
                    )}
                </SectionCard>

                {/* ── Livestream URLs ── */}
                <SectionCard>
                    <View style={styles.cardHeader}>
                        <Tv color={Colors.textMuted} size={16} />
                        <Text style={styles.cardTitle}>Livestream URLs</Text>
                    </View>
                    <Text style={styles.inputLabel}>Livestream URL</Text>
                    <TextInput
                        value={livestreamUrl}
                        onChangeText={handleLivestreamUrlChange}
                        placeholder="https://youtube.com/..."
                        placeholderTextColor={Colors.textDim}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {streamStartTime && (
                        <Text style={styles.calibratedText}>
                            ✓ Stream calibrated — {new Date(streamStartTime).toLocaleTimeString()}
                        </Text>
                    )}
                </SectionCard>

                {/* ── Find Event ── */}
                <SectionCard>
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={() => setFindEventOpen(o => !o)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeaderLeft}>
                            <View style={styles.iconBox}>
                                <Text style={styles.iconBoxText}>⊞</Text>
                            </View>
                            <Text style={styles.cardTitle}>FIND EVENT</Text>
                        </View>
                        {findEventOpen
                            ? <ChevronUp color={Colors.textMuted} size={18} />
                            : <ChevronDown color={Colors.textMuted} size={18} />}
                    </TouchableOpacity>

                    {findEventOpen && (
                        <>
                            {/* Featured Events */}
                            <Text style={styles.sectionLabel}>FEATURED EVENTS</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setDropdownOpen(o => !o)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.dropdownText}>{selectedEvent.label}</Text>
                                <ChevronDown color={Colors.textMuted} size={16} />
                            </TouchableOpacity>
                            {dropdownOpen && (
                                <View style={styles.dropdownMenu}>
                                    {FEATURED_EVENTS.map((ev) => (
                                        <TouchableOpacity
                                            key={ev.value}
                                            style={styles.dropdownItem}
                                            onPress={() => handleFeaturedSelect(ev)}
                                        >
                                            <Text style={[styles.dropdownText, ev.value === selectedEvent.value && { color: Colors.accentCyan }]}>
                                                {ev.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Search by URL */}
                            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SEARCH BY URL</Text>
                            <View style={styles.searchRow}>
                                <TextInput
                                    value={eventUrl}
                                    onChangeText={setEventUrl}
                                    placeholder="Paste RobotEvents URL..."
                                    placeholderTextColor={Colors.textDim}
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                    onSubmitEditing={handleSearchByUrl}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={handleSearchByUrl}
                                    activeOpacity={0.8}
                                >
                                    {eventLoading
                                        ? <ActivityIndicator color="#0d1117" size="small" />
                                        : <Text style={styles.searchButtonText}>Search</Text>}
                                </TouchableOpacity>
                            </View>

                            {/* ── Search by Team (commented out) ── */}
                            {/* <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SEARCH BY TEAM</Text>
                            <View style={styles.searchRow}>
                                <TextInput
                                    value={teamQuery}
                                    onChangeText={setTeamQuery}
                                    placeholder="Team number (e.g. 254A)..."
                                    placeholderTextColor={Colors.textDim}
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                    onSubmitEditing={handleSearchByTeam}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={handleSearchByTeam}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.searchButtonText}>Search</Text>
                                </TouchableOpacity>
                            </View> */}
                        </>
                    )}

                    {/* Loaded event name badge */}
                    {event && (
                        <TouchableOpacity
                            style={styles.eventLoaded}
                            onPress={openSheet}
                            activeOpacity={0.8}
                        >
                            <Star size={13} color={Colors.accentCyan} fill={Colors.accentCyan} />
                            <Text style={styles.eventLoadedText} numberOfLines={1}>{event.name}</Text>
                            <ChevronUp size={14} color={Colors.accentCyan} />
                        </TouchableOpacity>
                    )}
                </SectionCard>

                {/* Bottom padding so content isn't hidden by sheet */}
                <View style={{ height: sheetVisible ? SHEET_COLLAPSED + 20 : 20 }} />
            </ScrollView>

            {/* ── Bottom Tab Bar ── */}
            <View style={styles.bottomTabBar}>
                <TabButton
                    icon={<History color={activeNavTab === 'history' ? Colors.accentCyan : Colors.textMuted} size={22} />}
                    active={activeNavTab === 'history'}
                    onPress={() => setActiveNavTab('history')}
                />
                <TabButton
                    icon={<Settings color={activeNavTab === 'settings' ? Colors.accentCyan : Colors.textMuted} size={22} />}
                    active={activeNavTab === 'settings'}
                    onPress={() => setActiveNavTab('settings')}
                />
                <TabButton
                    icon={<GitBranch color={activeNavTab === 'github' ? Colors.accentCyan : Colors.textMuted} size={22} />}
                    active={activeNavTab === 'github'}
                    onPress={() => setActiveNavTab('github')}
                />
                <TabButton
                    icon={<RotateCcw color={activeNavTab === 'undo' ? Colors.accentRed : Colors.textMuted} size={22} />}
                    active={activeNavTab === 'undo'}
                    onPress={() => setActiveNavTab('undo')}
                />
            </View>

            {/* ── Event Bottom Sheet ── */}
            {sheetVisible && (
                <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
                    {/* Drag handle */}
                    <View {...panResponder.panHandlers} style={styles.sheetHandle}>
                        <View style={styles.sheetHandleBar} />
                        <View style={styles.sheetEventRow}>
                            <Star size={12} color={Colors.accentCyan} fill={Colors.accentCyan} />
                            <Text style={styles.sheetEventName} numberOfLines={1}>
                                {event?.name || 'Event'}
                            </Text>
                            <TouchableOpacity onPress={minimiseSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <ChevronDown color={Colors.textMuted} size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tab content */}
                    <EventView event={event} onWatch={handleWatch} />
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.background },

    header: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
        alignItems: 'center',
    },

    scrollContent: { paddingHorizontal: 12, paddingTop: 12, gap: 12 },

    card: {
        backgroundColor: Colors.cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: 14,
        gap: 10,
    },

    // Player
    playerCard: { padding: 0, overflow: 'hidden' },
    playerPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
    playerPlaceholderText: { color: Colors.textMuted, fontSize: 13 },

    // Card header
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    iconBox: { width: 24, height: 24, backgroundColor: Colors.iconBg, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    iconBoxText: { color: Colors.textMuted, fontSize: 12 },

    // Inputs
    inputLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
    input: {
        backgroundColor: Colors.inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        color: Colors.textPrimary,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 14,
        marginBottom: 2,
    },
    calibratedText: { color: Colors.accentCyan, fontSize: 11, marginTop: -4 },

    sectionLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // Dropdown
    dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.inputBg, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 14, paddingVertical: 12 },
    dropdownText: { color: Colors.textPrimary, fontSize: 14, flex: 1 },
    dropdownMenu: { backgroundColor: Colors.cardBgAlt, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },

    // Search row
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchButton: { backgroundColor: Colors.accentCyan, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, justifyContent: 'center' },
    searchButtonText: { color: '#0d1117', fontWeight: '700', fontSize: 14 },

    // Loaded event badge
    eventLoaded: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(34,211,238,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)', paddingHorizontal: 12, paddingVertical: 9, marginTop: 2 },
    eventLoadedText: { flex: 1, color: Colors.accentCyan, fontSize: 13, fontWeight: '600' },

    // Bottom nav
    bottomTabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: Colors.cardBorder,
        paddingBottom: 8,
        paddingTop: 4,
    },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
    tabButtonActive: { backgroundColor: 'rgba(34,211,238,0.08)' },

    // Bottom sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.cardBg,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 20,
        overflow: 'hidden',
    },
    sheetHandle: {
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
        alignItems: 'center',
        paddingTop: 10,
        gap: 8,
    },
    sheetHandleBar: { width: 36, height: 4, backgroundColor: Colors.textDim, borderRadius: 2 },
    sheetEventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, width: '100%' },
    sheetEventName: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
});
