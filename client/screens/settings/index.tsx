import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';

const STORAGE_KEYS = {
  BAIDU_API_KEY: 'baidu_api_key',
  BAIDU_SECRET_KEY: 'baidu_secret_key',
};

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  // 加载保存的密钥
  const loadKeys = useCallback(async () => {
    try {
      const savedApiKey = await AsyncStorage.getItem(STORAGE_KEYS.BAIDU_API_KEY);
      const savedSecretKey = await AsyncStorage.getItem(STORAGE_KEYS.BAIDU_SECRET_KEY);
      if (savedApiKey) setApiKey(savedApiKey);
      if (savedSecretKey) setSecretKey(savedSecretKey);
    } catch (error) {
      console.error('加载密钥失败:', error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, [loadKeys]);

  const handleSave = async () => {
    if (!apiKey || !secretKey) {
      Alert.alert('提示', '请填写完整的 API Key 和 Secret Key');
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BAIDU_API_KEY, apiKey);
      await AsyncStorage.setItem(STORAGE_KEYS.BAIDU_SECRET_KEY, secretKey);
      Alert.alert('成功', '密钥已保存');
    } catch (error) {
      console.error('保存密钥失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.BAIDU_API_KEY);
      await AsyncStorage.removeItem(STORAGE_KEYS.BAIDU_SECRET_KEY);
      setApiKey('');
      setSecretKey('');
      Alert.alert('成功', '密钥已清除');
    } catch (error) {
      console.error('清除密钥失败:', error);
      Alert.alert('错误', '清除失败，请重试');
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        {/* 标题 */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            设置
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            配置百度语音识别和合成 API
          </ThemedText>
        </ThemedView>

        {/* API Key 输入框 */}
        <View style={styles.inputContainer}>
          <ThemedText variant="smallMedium" color={theme.textMuted} style={styles.label}>
            API Key
          </ThemedText>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="请输入百度 API Key"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
          />
        </View>

        {/* Secret Key 输入框 */}
        <View style={styles.inputContainer}>
          <ThemedText variant="smallMedium" color={theme.textMuted} style={styles.label}>
            Secret Key
          </ThemedText>
          <TextInput
            style={styles.input}
            value={secretKey}
            onChangeText={setSecretKey}
            placeholder="请输入百度 Secret Key"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
          />
        </View>

        {/* 说明文字 */}
        <View style={styles.infoContainer}>
          <FontAwesome6 name="circle-info" size={16} color={theme.textMuted} />
          <ThemedText variant="caption" color={theme.textMuted} style={styles.infoText}>
            密钥将安全地保存在您的设备上，不会上传到云端。
          </ThemedText>
        </View>

        {/* 按钮组 */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <FontAwesome6 name="check" size={20} color="#FFFFFF" />
            <ThemedText variant="smallMedium" color="#FFFFFF" style={styles.buttonText}>
              保存
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <FontAwesome6 name="trash" size={20} color="#111111" />
            <ThemedText variant="smallMedium" color="#111111" style={styles.buttonText}>
              清除
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Screen>
  );
}
