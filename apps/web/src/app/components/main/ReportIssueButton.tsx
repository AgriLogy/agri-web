'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { FaBug, FaVideo, FaPlay } from 'react-icons/fa';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  buildMetadata,
  extractVideoThumbnail,
  isCloudinaryConfigured,
  submitReport,
  uploadVideo,
} from '@agri/api-client/feedbackApi';

type State = 'form' | 'recording' | 'submitting' | 'success' | 'error';

const MAX_DESCRIPTION = 2000;

const formatSeconds = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

type Props = {
  /** 'navbar' (default): ghost icon button. 'sidebar': rail row styled like
   *  the sidebar nav items, with the popover opening to the right. */
  variant?: 'navbar' | 'sidebar';
};

const ReportIssueButton: React.FC<Props> = ({ variant = 'navbar' }) => {
  const t = useTranslations('feedback');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { headerBarBorder, textColor, mutedTextColor, hoverColor } =
    useColorModeStyles();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const sessionStartRef = useRef<number | null>(null);
  const [state, setState] = useState<State>('form');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [videoUploadFailed, setVideoUploadFailed] = useState(false);

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancellingRef = useRef(false);

  const stopRecordingCleanup = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => stopRecordingCleanup, [stopRecordingCleanup]);

  // Stamp session start once mounted (kept out of render to satisfy purity).
  useEffect(() => {
    if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
  }, []);

  const resetForm = useCallback(() => {
    setState('form');
    setMessage('');
    setMessageError('');
    setErrorMessage('');
    setVideoBlob(null);
    setVideoThumbnail(null);
    setVideoDuration(0);
    setVideoUploadFailed(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(resetForm, 300);
  }, [onClose, resetForm]);

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setErrorMessage(t('errors.recordingUnsupported'));
      setState('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        if (cancellingRef.current) {
          cancellingRef.current = false;
          setState('form');
          return;
        }
        const blob = new Blob(recordingChunksRef.current, {
          type: 'video/webm',
        });
        const duration = recordingSecondsRef.current;
        const thumb = await extractVideoThumbnail(blob);
        setVideoBlob(blob);
        setVideoThumbnail(thumb);
        setVideoDuration(duration);
        setState('form');
      };
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };

      recorder.start();
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      setState('recording');
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          recordingSecondsRef.current = s + 1;
          return s + 1;
        });
      }, 1000);
    } catch {
      // Picker cancelled / permission denied — stay on the form silently.
    }
  };

  const handleStopRecording = () => stopRecordingCleanup();
  const handleCancelRecording = () => {
    cancellingRef.current = true;
    stopRecordingCleanup();
  };
  const handleReRecord = () => {
    setVideoBlob(null);
    setVideoThumbnail(null);
    setVideoUploadFailed(false);
  };

  const handleSubmit = useCallback(
    async (skipVideo = false) => {
      const text = message.trim();
      if (!text) {
        setMessageError(t('errors.descriptionRequired'));
        return;
      }
      setState('submitting');
      setVideoUploadFailed(false);

      let videoUrl: string | undefined;
      if (!skipVideo && videoBlob) {
        videoUrl = await uploadVideo(videoBlob).catch(() => undefined);
        if (!videoUrl) {
          setVideoUploadFailed(true);
          setState('form');
          return;
        }
      }

      try {
        await submitReport({
          type: 'bug',
          title: text.slice(0, 100),
          description: text,
          ...(videoUrl ? { video_url: videoUrl } : {}),
          metadata: buildMetadata(
            pathname,
            searchParams.toString() ? `?${searchParams.toString()}` : '',
            sessionStartRef.current ?? Date.now()
          ),
        });
        setState('success');
      } catch {
        setErrorMessage(t('errors.sendFailed'));
        setState('error');
      }
    },
    [message, videoBlob, pathname, searchParams, t]
  );

  const charCount = message.trim().length;

  const renderBody = () => {
    if (state === 'success') {
      return (
        <VStack spacing={3} py={4} textAlign="center">
          <Box fontSize="2xl" color="primary.500" aria-hidden lineHeight={1}>
            ✓
          </Box>
          <Text fontWeight="semibold" color={textColor}>
            {t('success.title')}
          </Text>
          <Text fontSize="sm" color={mutedTextColor}>
            {t('success.subtitle')}
          </Text>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            {t('actions.close')}
          </Button>
        </VStack>
      );
    }

    if (state === 'error') {
      return (
        <VStack spacing={3} py={2} align="stretch">
          <Text fontSize="sm" color={textColor}>
            {errorMessage}
          </Text>
          <HStack justify="flex-end">
            <Button size="sm" variant="ghost" onClick={handleClose}>
              {t('actions.cancel')}
            </Button>
            <Button
              size="sm"
              colorScheme="primary"
              onClick={() => {
                setErrorMessage('');
                setState('form');
              }}
            >
              {t('actions.tryAgain')}
            </Button>
          </HStack>
        </VStack>
      );
    }

    if (state === 'recording') {
      return (
        <VStack spacing={3} py={2} align="stretch">
          <HStack>
            <Box w={2} h={2} borderRadius="full" bg="red.500" />
            <Text fontSize="sm" color={textColor}>
              {t('recording.inProgress', {
                time: formatSeconds(recordingSeconds),
              })}
            </Text>
          </HStack>
          <Text fontSize="xs" color={mutedTextColor}>
            {t('recording.hint')}
          </Text>
          <Button size="sm" colorScheme="red" onClick={handleStopRecording}>
            {t('recording.stop')}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelRecording}>
            {t('actions.cancel')}
          </Button>
        </VStack>
      );
    }

    // state === 'form' | 'submitting'
    return (
      <VStack spacing={3} align="stretch">
        {isCloudinaryConfigured() && (
          <>
            {videoThumbnail ? (
              <Box position="relative" borderRadius="md" overflow="hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={videoThumbnail}
                  alt={t('media.thumbnailAlt')}
                  style={{ width: '100%', display: 'block' }}
                />
                <HStack
                  position="absolute"
                  inset={0}
                  justify="center"
                  bg="blackAlpha.400"
                  spacing={2}
                >
                  <IconButton
                    aria-label={t('media.play')}
                    icon={<FaPlay />}
                    size="sm"
                    isRound
                    onClick={() =>
                      videoBlob &&
                      window.open(URL.createObjectURL(videoBlob), '_blank')
                    }
                  />
                  <Text color="white" fontSize="xs">
                    {formatSeconds(videoDuration)}
                  </Text>
                </HStack>
                <Button
                  size="xs"
                  variant="solid"
                  position="absolute"
                  top={1}
                  right={1}
                  onClick={handleReRecord}
                >
                  {t('media.reRecord')}
                </Button>
              </Box>
            ) : (
              <Button
                leftIcon={<FaVideo />}
                variant="outline"
                size="sm"
                onClick={handleStartRecording}
              >
                {t('media.recordScreen')}
              </Button>
            )}
            {!videoThumbnail && (
              <Text fontSize="xs" color={mutedTextColor}>
                {t('media.recordHint')}
              </Text>
            )}
          </>
        )}

        {videoUploadFailed && (
          <VStack
            spacing={2}
            align="stretch"
            p={2}
            borderRadius="md"
            bg="orange.50"
            _dark={{ bg: 'whiteAlpha.100' }}
          >
            <Text fontSize="xs" color={textColor}>
              {t('media.uploadFailed')}
            </Text>
            <HStack>
              <Button size="xs" onClick={() => handleSubmit(true)}>
                {t('media.submitWithout')}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => handleSubmit(false)}
              >
                {t('actions.tryAgain')}
              </Button>
            </HStack>
          </VStack>
        )}

        <Divider borderColor={headerBarBorder} />

        <Box>
          <Text fontSize="sm" fontWeight="medium" color={textColor} mb={1}>
            {t('form.label')}
          </Text>
          <Textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value.slice(0, MAX_DESCRIPTION));
              setMessageError('');
            }}
            placeholder={t('form.placeholder')}
            rows={4}
            size="sm"
            isInvalid={Boolean(messageError)}
          />
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color="red.500">
              {messageError}
            </Text>
            <Text fontSize="xs" color={mutedTextColor}>
              {charCount}/{MAX_DESCRIPTION}
            </Text>
          </HStack>
        </Box>

        <HStack justify="flex-end">
          <Button size="sm" variant="ghost" onClick={handleClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            size="sm"
            colorScheme="primary"
            isLoading={state === 'submitting'}
            onClick={() => handleSubmit()}
          >
            {t('actions.submit')}
          </Button>
        </HStack>
      </VStack>
    );
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={state === 'recording' ? () => undefined : handleClose}
      placement={variant === 'sidebar' ? 'right-end' : 'bottom-end'}
      closeOnBlur={false}
      isLazy
    >
      <Tooltip
        label={t('trigger')}
        hasArrow
        openDelay={300}
        placement={variant === 'sidebar' ? 'right' : 'bottom'}
      >
        <Box display={variant === 'sidebar' ? 'block' : 'inline-flex'} w={variant === 'sidebar' ? '100%' : undefined}>
          <PopoverTrigger>
            {variant === 'sidebar' ? (
              <Flex
                align="center"
                justify="center"
                h="44px"
                w="100%"
                borderRadius="lg"
                cursor="pointer"
                tabIndex={0}
                role="button"
                aria-label={t('trigger')}
                transition="background 0.15s ease, color 0.15s ease"
                _hover={{ color: hoverColor, bg: 'blackAlpha.50' }}
                _dark={{ _hover: { bg: 'whiteAlpha.100' } }}
              >
                <FaBug size={20} aria-hidden />
              </Flex>
            ) : (
              <IconButton
                aria-label={t('trigger')}
                icon={<FaBug />}
                variant="ghost"
                size="md"
                borderRadius="xl"
                _hover={{ bg: 'blackAlpha.50', color: hoverColor }}
                _dark={{ _hover: { bg: 'whiteAlpha.100', color: hoverColor } }}
              />
            )}
          </PopoverTrigger>
        </Box>
      </Tooltip>
      <Portal>
        <PopoverContent
          w="320px"
          borderColor={headerBarBorder}
          boxShadow="lg"
          _focus={{ outline: 'none' }}
        >
          <PopoverArrow />
          <PopoverHeader fontWeight="semibold" fontSize="sm" color={textColor}>
            {t('trigger')}
          </PopoverHeader>
          <PopoverBody>{renderBody()}</PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default ReportIssueButton;
