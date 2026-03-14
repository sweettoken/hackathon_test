import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Alert, Platform, TouchableOpacity, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { createFormDataFile } from '@/utils';

const STORAGE_KEYS = {
  BAIDU_API_KEY: 'baidu_api_key',
  BAIDU_SECRET_KEY: 'baidu_secret_key',
};

export default function VoiceScreen() {
  const router = useSafeRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isRecording), [theme, isRecording]);

  // 申请录音权限
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // 清理函数
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // 开始录音
  const startRecording = async () => {
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请授予录音权限');
        return;
      }
      setHasPermission(true);
    }

    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      // 使用自定义录音选项，兼容百度 ASR（支持 wav 格式）
      const recordingOptions: any = {
        android: {
          extension: '.m4a',
          outputFormat: 2, // AAC/MPEG4 格式
          audioEncoder: 3, // AAC 编码器
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: 'lpcm', // Linear PCM 格式
          audioQuality: 'high',
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecognizedText('');
      setAiResponse('');
      setAudioUrl('');
    } catch (error) {
      console.error('录音失败:', error);
      Alert.alert('错误', '录音启动失败');
    }
  };

  // 停止录音并处理
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        await processVoice(uri);
      }
    } catch (error) {
      console.error('停止录音失败:', error);
      setIsRecording(false);
    }
  };

  // 处理语音：上传 → ASR → LLM → TTS
  const processVoice = async (uri: string) => {
    if (!uri) return;

    // 检查是否配置了密钥
    const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.BAIDU_API_KEY);
    const secretKey = await AsyncStorage.getItem(STORAGE_KEYS.BAIDU_SECRET_KEY);

    if (!apiKey || !secretKey) {
      Alert.alert(
        '提示',
        '请先在设置中配置百度 API Key 和 Secret Key',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 使用 FormData 上传音频文件
      const formData = new FormData();
      // 根据平台选择文件扩展名（iOS 用 wav，Android/Web 用 m4a）
      const fileExtension = Platform.OS === 'ios' ? 'wav' : 'm4a';
      const mimeType = Platform.OS === 'ios' ? 'audio/wav' : 'audio/mp4';
      const file = await createFormDataFile(uri, `recording_${Date.now()}.${fileExtension}`, mimeType);
      formData.append('file', file as any);
      formData.append('apiKey', apiKey);
      formData.append('secretKey', secretKey);

      /**
       * 服务端文件：server/src/routes/voice.ts
       * 接口：POST /api/v1/voice/process
       * Body 参数：
       *   - file: File (音频文件)
       *   - apiKey: string (百度 API Key)
       *   - secretKey: string (百度 Secret Key)
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('语音处理失败');
      }

      const result = await response.json();

      setRecognizedText(result.recognizedText || '');
      setAiResponse(result.aiResponse || '');
      setAudioUrl(result.audioUrl || '');
    } catch (error) {
      console.error('语音处理失败:', error);
      Alert.alert('错误', '语音处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 播放 TTS 音频
  const playAudio = async () => {
    if (!audioUrl) return;

    try {
      // 停止当前播放
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      }

      // 创建新音频
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            soundRef.current = null;
          }
        },
      );

      soundRef.current = sound;
    } catch (error) {
      console.error('播放失败:', error);
      Alert.alert('错误', '音频播放失败');
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        {/* 标题 */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="gear" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>
            语音助手
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            点击录音，与AI对话
          </ThemedText>
        </ThemedView>

        {/* 录音按钮 */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonRecording,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <View style={styles.recordButtonInner}>
            {isRecording ? (
              <FontAwesome6 name="stop" size={32} color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="microphone" size={32} color="#111111" />
            )}
          </View>
        </TouchableOpacity>

        {/* 状态提示 */}
        {isProcessing && (
          <ThemedText variant="body" color={theme.textSecondary} style={styles.statusText}>
            处理中...
          </ThemedText>
        )}
        {isRecording && (
          <ThemedText variant="body" color={theme.textSecondary} style={styles.statusText}>
            录音中...
          </ThemedText>
        )}

        {/* 识别文本 */}
        {recognizedText ? (
          <View style={styles.textContainer}>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.textLabel}>
              识别结果
            </ThemedText>
            <ThemedView level="default" style={styles.textBox}>
              <ThemedText variant="body" color={theme.textPrimary}>
                {recognizedText}
              </ThemedText>
            </ThemedView>
          </View>
        ) : null}

        {/* AI 响应 */}
        {aiResponse ? (
          <View style={styles.textContainer}>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.textLabel}>
              AI 回复
            </ThemedText>
            <ThemedView level="default" style={styles.textBox}>
              <ThemedText variant="body" color={theme.textPrimary}>
                {aiResponse}
              </ThemedText>
            </ThemedView>
          </View>
        ) : null}

        {/* 播放按钮 */}
        {audioUrl && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={playAudio}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="play" size={20} color="#FFFFFF" />
            <ThemedText variant="smallMedium" color="#FFFFFF" style={styles.playButtonText}>
              播放回复
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    </Screen>
  );
}
