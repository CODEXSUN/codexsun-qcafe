import { useEffect, useRef, useState } from "react";

type RecognitionEvent = Event & {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type RecognitionError = Event & { error?: string };
type Recognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: RecognitionError) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

const autoSpeakStorageKey = "zetro.voice.auto-speak.v1";

export function useZetroVoiceAssistant() {
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [autoSpeak, setAutoSpeakState] = useState(readAutoSpeak);
  const supported = Boolean(getRecognition());
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => {
    cancelListening();
    stopSpeaking();
  }, []);

  async function startListening(onComplete: (value: string) => void) {
    const RecognitionApi = getRecognition();
    if (!RecognitionApi) {
      setError("Voice typing is unavailable. Use Chrome or Edge, or type your message.");
      return;
    }

    try {
      await requestMicrophoneAccess();
    } catch {
      setError("Microphone access is blocked. Allow it for CODEXSUN Desk, then retry.");
      return;
    }

    cancelListening();
    const recognition = new RecognitionApi();
    transcriptRef.current = "";
    cancelledRef.current = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const value = readTranscript(event);
      transcriptRef.current = value;
      setTranscript(value);
    };
    recognition.onerror = (event) => {
      const permissionDenied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setError(permissionDenied ? "Microphone access is blocked. Allow it in site settings, then retry." : "Honey could not hear you. Check the microphone and retry.");
      cancelledRef.current = true;
      setListening(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      const value = transcriptRef.current.trim();
      if (!cancelledRef.current && value) onComplete(value);
    };
    recognitionRef.current = recognition;
    setError("");
    setTranscript("");
    setListening(true);
    recognition.start();
  }

  function cancelListening() {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setTranscript("");
  }

  async function toggleListening(onComplete: (value: string) => void) {
    if (listening) recognitionRef.current?.stop();
    else await startListening(onComplete);
  }

  function speak(value: string) {
    if (!speechSupported) {
      setError("Spoken replies are unavailable in this browser.");
      return;
    }

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(toSpeechText(value));
    utterance.lang = navigator.language || "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError("Honey could not read that reply aloud.");
    };
    setError("");
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function setAutoSpeak(value: boolean) {
    setAutoSpeakState(value);
    try {
      window.localStorage.setItem(autoSpeakStorageKey, String(value));
    } catch {
      // The voice preference is optional when browser storage is unavailable.
    }
  }

  return {
    autoSpeak,
    cancelListening,
    error,
    listening,
    setAutoSpeak,
    speaking,
    speechSupported,
    speak,
    stopSpeaking,
    supported,
    toggleListening,
    transcript,
  };
}

function getRecognition(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const voiceWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
}

function readAutoSpeak() {
  try {
    return window.localStorage.getItem(autoSpeakStorageKey) !== "false";
  } catch {
    return true;
  }
}

function readTranscript(event: RecognitionEvent) {
  const phrases: string[] = [];
  for (let index = 0; index < event.results.length; index += 1) {
    const phrase = event.results[index]?.[0]?.transcript.trim();
    if (phrase) phrases.push(phrase);
  }
  return phrases.join(" ");
}

function toSpeechText(value: string) {
  return value
    .replace(/```[\s\S]*?```/gu, "Code details omitted.")
    .replace(/[`*_>#\[\]]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 8_000);
}

async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}
