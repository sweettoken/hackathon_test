import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';
import crypto from 'crypto';

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 获取百度 Access Token
async function getBaiduAccessToken(apiKey: string, secretKey: string): Promise<string> {
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('获取百度 Access Token 失败');
  }

  const data = await response.json() as {
    access_token: string;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(`获取 Access Token 失败: ${data.error_description}`);
  }

  return data.access_token;
}

// 百度 ASR 语音识别
async function baiduASR(audioBuffer: Buffer, accessToken: string, filename: string): Promise<string> {
  const url = `https://vop.baidu.com/server_api`;

  // 根据文件扩展名确定格式
  let format = 'wav';
  if (filename.endsWith('.m4a') || filename.endsWith('.aac')) {
    format = 'm4a';
  } else if (filename.endsWith('.amr')) {
    format = 'amr';
  } else if (filename.endsWith('.flac')) {
    format = 'flac';
  }

  console.log('百度 ASR 格式:', format, '文件:', filename, '大小:', audioBuffer.length);

  // 将音频转换为 base64
  const base64Audio = audioBuffer.toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: format, // 音频格式（支持：pcm, wav, amr, m4a）
      rate: 16000, // 采样率（16000 固定值）
      channel: 1, // 声道数（1 固定值）
      cuid: crypto.randomUUID(), // 用户唯一标识
      token: accessToken,
      speech: base64Audio,
      len: audioBuffer.length, // 音频原始数据长度（不是 base64 长度）
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('百度 ASR 请求失败:', errorText);
    throw new Error('百度 ASR 请求失败');
  }

  const data = await response.json() as {
    err_no: number;
    err_msg: string;
    result?: string[];
  };

  if (data.err_no !== 0) {
    console.error('百度 ASR 错误:', data.err_msg, '错误码:', data.err_no);
    throw new Error(`百度 ASR 识别失败: ${data.err_msg} (错误码: ${data.err_no})`);
  }

  return data.result?.[0] || '';
}

// 百度 TTS 语音合成
async function baiduTTS(text: string, accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    tex: text,
    tok: accessToken,
    cuid: crypto.randomUUID(),
    ctp: '1',
    lan: 'zh',
    spd: '5', // 语速 0-15
    pit: '5', // 音调 0-15
    vol: '5', // 音量 0-15
    per: '0', // 发音人 0-女声 1-男声
  });

  const url = `https://tsn.baidu.com/text2audio?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    // 检查是否是错误响应
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json() as { error_msg: string };
      throw new Error(`百度 TTS 合成失败: ${errorData.error_msg}`);
    }
    throw new Error('百度 TTS 请求失败');
  }

  // 将音频上传到对象存储
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const audioKey = await storage.uploadFile({
    fileContent: audioBuffer,
    fileName: `tts/${Date.now()}.mp3`,
    contentType: 'audio/mp3',
  });

  // 生成签名 URL
  const audioUrl = await storage.generatePresignedUrl({
    key: audioKey,
    expireTime: 3600, // 1小时有效期
  });

  return audioUrl;
}

/**
 * 语音处理接口：录音 → 百度 ASR → DeepSeek → 百度 TTS
 * POST /api/v1/voice/process
 * Body: FormData
 *   - file: 音频文件
 *   - apiKey: 百度 API Key
 *   - secretKey: 百度 Secret Key
 * 返回: { recognizedText: string, aiResponse: string, audioUrl: string }
 */
router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // 获取百度 API Key 和 Secret Key
    const apiKey = req.body.apiKey as string;
    const secretKey = req.body.secretKey as string;

    if (!apiKey || !secretKey) {
      return res.status(400).json({ error: '缺少百度 API Key 或 Secret Key' });
    }

    // 1. 检查文件
    if (!req.file) {
      return res.status(400).json({ error: '未上传音频文件' });
    }

    console.log('[1/4] 接收到音频文件:', req.file.originalname, '大小:', req.file.size);

    // 2. 获取百度 Access Token
    console.log('[2/4] 获取百度 Access Token...');
    const accessToken = await getBaiduAccessToken(apiKey, secretKey);

    // 3. 百度 ASR 语音识别
    console.log('[3/4] 调用百度 ASR 识别...');
    console.log('音频文件:', req.file.originalname, '大小:', req.file.size, '字节');
    const recognizedText = await baiduASR(req.file.buffer, accessToken, req.file.originalname);
    console.log('ASR 识别结果:', recognizedText);

    // 4. 调用 DeepSeek 处理文本
    console.log('[4/4] 调用 DeepSeek 处理文本...');
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const llmConfig = new Config();
    const llmClient = new LLMClient(llmConfig, customHeaders);

    const messages = [
      {
        role: 'system' as const,
        content: '你是一个友好的AI助手，请用简洁、自然的方式回应用户的语音输入。',
      },
      {
        role: 'user' as const,
        content: recognizedText,
      },
    ];

    const llmResponse = await llmClient.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.7,
    });
    console.log('DeepSeek 响应:', llmResponse.content);

    // 5. 百度 TTS 语音合成
    console.log('[5/4] 调用百度 TTS 合成...');
    const audioUrl = await baiduTTS(llmResponse.content, accessToken);
    console.log('TTS 合成完成:', audioUrl);

    // 返回结果
    res.json({
      recognizedText,
      aiResponse: llmResponse.content,
      audioUrl,
    });
  } catch (error) {
    console.error('语音处理失败:', error);
    res.status(500).json({
      error: '语音处理失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 错误处理中间件
router.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件大小超过限制（最大 100MB）' });
    }
  }
  next(err);
});

export default router;
