import { act, renderHook } from '@testing-library/react';

import { pickMimeType, useVoiceRecorder } from './useVoiceRecorder';

describe('pickMimeType', () => {
  it('prefers WebM/Opus, then plain WebM, then MP4 (Safari)', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((t) => t === 'audio/webm')).toBe('audio/webm');
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBe('');
  });
});

/** Minimal MediaRecorder: start() records, stop() emits one chunk. */
class FakeRecorder {
  static isTypeSupported = (t: string) => t === 'audio/webm;codecs=opus';
  state = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: { getTracks: () => { stop: () => void }[] },
    opts?: { mimeType?: string }
  ) {
    this.mimeType = opts?.mimeType ?? '';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({
      data: new Blob(['voice'], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}

describe('useVoiceRecorder', () => {
  const trackStop = jest.fn();
  beforeEach(() => {
    trackStop.mockReset();
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder =
      FakeRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: trackStop }],
        }),
      },
    });
  });

  it('records, transcribes and hands back the text', async () => {
    const transcribe = jest.fn().mockResolvedValue(' شحال خاصني نسقي؟ ');
    const onTranscript = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ transcribe, onTranscript, onError })
    );
    expect(result.current.supported).toBe(true);
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('recording');
    await act(async () => {
      result.current.stop();
    });
    const blob = transcribe.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('audio/webm;codecs=opus');
    expect(onTranscript).toHaveBeenCalledWith('شحال خاصني نسقي؟');
    expect(onError).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalled(); // microphone released
    expect(result.current.status).toBe('idle');
  });

  it('reports a refused microphone', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error('denied')
    );
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({
        transcribe: jest.fn(),
        onTranscript: jest.fn(),
        onError,
      })
    );
    await act(async () => {
      await result.current.start();
    });
    expect(onError).toHaveBeenCalledWith('permission');
    expect(result.current.status).toBe('idle');
  });

  it('reports a failed transcription and an empty one', async () => {
    const onError = jest.fn();
    const transcribe = jest
      .fn()
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValueOnce('  ');
    const { result } = renderHook(() =>
      useVoiceRecorder({ transcribe, onTranscript: jest.fn(), onError })
    );
    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        await result.current.start();
      });
      await act(async () => {
        result.current.stop();
      });
    }
    expect(onError.mock.calls).toEqual([['failed'], ['empty']]);
  });
});
