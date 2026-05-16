import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    speechSynthesis: SpeechSynthesis;
  }
}

const avatarImage = require('../../assets/images/avatar.png');

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
  file?: File;
};

type DashboardData = {
  filename: string;
  month?: string;
  financial_score?: number;
  risk_level?: string;
  top_anomalies?: string[];
  subscriptions?: string[];
  large_expenses?: string[];
  recommendations?: string[];
  analysis?: string;
};

export default function HomeScreen() {
  const [message, setMessage] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [rawAnalysisText, setRawAnalysisText] = useState('');
  const [showRawAnalysis, setShowRawAnalysis] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const conversationModeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      speakHebrew('שלום ספי, אני HomeMind, העוזר הפיננסי החכם שלך.', false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  const speakHebrew = (textToSpeak: string, continueConversation = true) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = textToSpeak
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/\n/g, ' ')
      .replace(/HomeMind/g, 'הום מיינד')
      .replace(/AI/g, 'איי איי');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'he-IL';
    utterance.rate = 0.92;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsListening(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (continueConversation && conversationModeRef.current) {
        setTimeout(() => startListeningLoop(), 700);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (continueConversation && conversationModeRef.current) {
        setTimeout(() => startListeningLoop(), 700);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}

    setIsListening(false);
  };

  const startConversation = () => {
    conversationModeRef.current = true;
    setIsConversationMode(true);
    setAiAnswer('מצב שיחה רציפה הופעל. אני מקשיב...');
    setTimeout(() => startListeningLoop(), 300);
  };

  const stopConversation = () => {
    conversationModeRef.current = false;
    setIsConversationMode(false);
    stopListening();
    window.speechSynthesis?.cancel();
    setAiAnswer('השיחה הרציפה נעצרה.');
  };

  const toggleConversation = () => {
    if (conversationModeRef.current) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  const sendMessageToAI = async (textToSend?: string) => {
    const finalMessage = textToSend || message;

    if (!finalMessage.trim()) return;
    if (isSendingRef.current) return;

    try {
      isSendingRef.current = true;
      setMessage('');
      setAiAnswer('HomeMind חושב...');

      const updatedHistory: ChatMessage[] = [
        ...chatHistory,
        { role: 'user', content: finalMessage },
      ];

      setChatHistory(updatedHistory);

      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessage, history: updatedHistory }),
      });

      const data = await response.json();
      const answer = data.answer || data.response || 'לא התקבלה תשובה';

      setAiAnswer(answer);
      setChatHistory([...updatedHistory, { role: 'assistant', content: answer }]);

      isSendingRef.current = false;
      speakHebrew(answer, true);
    } catch {
      isSendingRef.current = false;
      setAiAnswer('אירעה שגיאה בחיבור ל־HomeMind AI');
    }
  };

  const startListeningLoop = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAiAnswer('הדפדפן הזה לא תומך בזיהוי קולי. נסה דרך Chrome.');
      return;
    }

    if (!conversationModeRef.current) return;
    if (isSendingRef.current) return;

    stopListening();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'he-IL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    setIsListening(true);

    let gotResult = false;

    recognition.onresult = (event: any) => {
      gotResult = true;
      const spokenText = event.results[0][0].transcript;

      setIsListening(false);
      setMessage(spokenText);

      setTimeout(() => sendMessageToAI(spokenText), 300);
    };

    recognition.onerror = () => {
      setIsListening(false);

      if (conversationModeRef.current && !isSendingRef.current) {
        setTimeout(() => startListeningLoop(), 900);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!gotResult && conversationModeRef.current && !isSendingRef.current) {
        setTimeout(() => startListeningLoop(), 700);
      }
    };

    recognition.start();
  };

  const handlePickDocuments = async () => {
    try {
      if (typeof window !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,text/plain';
        input.multiple = true;

        input.onchange = () => {
          const files = Array.from(input.files || []);

          const pickedFiles = files.map((file) => ({
            uri: URL.createObjectURL(file),
            name: file.name,
            mimeType: file.type || 'application/pdf',
            file,
          }));

          setSelectedFiles(pickedFiles);
          setDashboards([]);
          setRawAnalysisText('');
          setShowRawAnalysis(false);
          setStatusMessage(`נבחרו ${pickedFiles.length} קבצים. עכשיו לחץ "נתח מסמכים".`);
        };

        input.click();
      }
    } catch {
      setStatusMessage('אירעה שגיאה בבחירת המסמכים');
    }
  };

  const normalizeDashboard = (
    filename: string,
    month: string,
    dashboard: any,
    analysis: string
  ): DashboardData => {
    return {
      filename,
      month: dashboard?.month || month || 'לא זוהה',
      financial_score: dashboard?.financial_score ?? 0,
      risk_level: dashboard?.risk_level || 'unknown',
      top_anomalies: Array.isArray(dashboard?.top_anomalies) ? dashboard.top_anomalies : [],
      subscriptions: Array.isArray(dashboard?.subscriptions) ? dashboard.subscriptions : [],
      large_expenses: Array.isArray(dashboard?.large_expenses) ? dashboard.large_expenses : [],
      recommendations: Array.isArray(dashboard?.recommendations) ? dashboard.recommendations : [],
      analysis,
    };
  };

  const analyzeSelectedDocuments = async () => {
    if (selectedFiles.length === 0) {
      setStatusMessage('לא נבחרו קבצים');
      return;
    }

    try {
      setIsUploading(true);
      setDashboards([]);
      setRawAnalysisText('');
      setShowRawAnalysis(false);
      setStatusMessage(`HomeMind מנתח ${selectedFiles.length} מסמכים...`);

      const newDashboards: DashboardData[] = [];
      const textSummaries: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const pickedFile = selectedFiles[i];

        setStatusMessage(`מנתח מסמך ${i + 1} מתוך ${selectedFiles.length}: ${pickedFile.name}`);

        const formData = new FormData();
        formData.append('file', pickedFile.file as File);

        const response = await fetch('http://127.0.0.1:8000/analyze-document', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          textSummaries.push(`📄 ${pickedFile.name}\nשגיאה: ${JSON.stringify(data)}`);
          continue;
        }

        const analysis = data.analysis || 'לא התקבל ניתוח';

        const dashboardItem = normalizeDashboard(
          data.filename || pickedFile.name,
          data.month,
          data.dashboard,
          analysis
        );

        newDashboards.push(dashboardItem);
        textSummaries.push(`📄 ${pickedFile.name}\n${analysis}`);
        setDashboards([...newDashboards]);
      }

      setRawAnalysisText(textSummaries.join('\n\n====================\n\n'));
      setStatusMessage('הניתוח הסתיים. הדשבורד מוכן.');
      speakHebrew('סיימתי לנתח את כל המסמכים. הדשבורד מוכן.', true);
    } catch {
      setStatusMessage('אירעה שגיאה בניתוח המסמכים');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setDashboards([]);
    setRawAnalysisText('');
    setShowRawAnalysis(false);
    setStatusMessage('');
  };

  const getAverageScore = () => {
    if (dashboards.length === 0) return 72;

    const scores = dashboards
      .map((item) => Number(item.financial_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 72;

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const getRiskLabel = () => {
    const allRisks = dashboards.map((item) => item.risk_level?.toLowerCase() || '');

    if (allRisks.some((risk) => risk.includes('high'))) return 'גבוה';
    if (allRisks.some((risk) => risk.includes('medium'))) return 'בינוני';
    if (allRisks.some((risk) => risk.includes('low'))) return 'נמוך';

    return dashboards.length > 0 ? 'בינוני' : 'טרם נותח';
  };

  const getAllItems = (key: keyof DashboardData) => {
    return dashboards.flatMap((item) => {
      const value = item[key];
      return Array.isArray(value) ? value : [];
    });
  };

  const renderList = (items: string[], emptyText: string) => {
    if (!items || items.length === 0) {
      return <Text style={styles.emptyText}>{emptyText}</Text>;
    }

    return items.slice(0, 6).map((item, index) => (
      <View key={`${item}-${index}`} style={styles.insightRow}>
        <Text style={styles.insightDot}>●</Text>
        <Text style={styles.listItem}>{item}</Text>
      </View>
    ));
  };

  const score = getAverageScore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatarSmall}>
              <Image source={avatarImage} style={styles.avatarSmallImage} />
            </View>

            <View>
              <Text style={styles.greeting}>שלום ספי 👋</Text>
              <Text style={styles.logo}>HomeMind AI</Text>
            </View>
          </View>

          <Text style={styles.heroLabel}>התמונה הפיננסית שלך</Text>
          <Text style={styles.heroAmount}>
            {dashboards.length > 0 ? `${dashboards.length} מסמכים נותחו` : 'מוכן לניתוח חכם'}
          </Text>

          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{score}</Text>
              <Text style={styles.heroMetricLabel}>ציון פיננסי</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{getRiskLabel()}</Text>
              <Text style={styles.heroMetricLabel}>רמת סיכון</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>
                {getAllItems('subscriptions').length || 0}
              </Text>
              <Text style={styles.heroMetricLabel}>מנויים</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={handlePickDocuments}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionTitle}>מסמכים</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={analyzeSelectedDocuments}
            disabled={isUploading}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>{isUploading ? 'מנתח' : 'נתח'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={toggleConversation}>
            <Text style={styles.actionIcon}>{isConversationMode ? '🛑' : '🎤'}</Text>
            <Text style={styles.actionTitle}>{isConversationMode ? 'עצור' : 'דיבור'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={clearSelectedFiles}>
            <Text style={styles.actionIcon}>🧹</Text>
            <Text style={styles.actionTitle}>נקה</Text>
          </TouchableOpacity>
        </View>

        {statusMessage.length > 0 && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {selectedFiles.length > 0 && (
          <View style={styles.filesBox}>
            <Text style={styles.sectionTitle}>קבצים שנבחרו</Text>

            {selectedFiles.slice(0, 5).map((file, index) => (
              <Text key={`${file.name}-${index}`} style={styles.fileName}>
                {index + 1}. {file.name}
              </Text>
            ))}

            {selectedFiles.length > 5 && (
              <Text style={styles.fileMore}>ועוד {selectedFiles.length - 5} קבצים...</Text>
            )}
          </View>
        )}

        <View style={styles.mainGrid}>
          <View style={styles.premiumCard}>
            <Text style={styles.cardEyebrow}>Spending Health</Text>
            <Text style={styles.bigScore}>{score}</Text>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreFill, { width: `${Math.min(score, 100)}%` }]} />
            </View>
            <Text style={styles.cardText}>
              {dashboards.length > 0
                ? 'המערכת זיהתה דפוסי הוצאה, חריגות ומנויים חוזרים.'
                : 'העלה דוחות אשראי ובנק כדי לקבל תמונת מצב מלאה.'}
            </Text>
          </View>

          <View style={styles.premiumCard}>
            <Text style={styles.cardEyebrow}>AI Copilot</Text>
            <Text style={styles.aiHeadline}>מה חשוב עכשיו?</Text>
            <Text style={styles.cardText}>
              {dashboards.length > 0
                ? 'בדוק חריגות, חיובים חוזרים והמלצות חיסכון לפני החיוב הקרוב.'
                : 'HomeMind מוכן לקרוא מסמכים ישראליים ולהפוך אותם לתובנות.'}
            </Text>
          </View>
        </View>

        {dashboards.length > 0 && (
          <View style={styles.dashboardBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dashboard</Text>
              <Text style={styles.sectionLink}>Live Analysis</Text>
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{dashboards.length}</Text>
                <Text style={styles.kpiLabel}>מסמכים</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{getAllItems('top_anomalies').length}</Text>
                <Text style={styles.kpiLabel}>חריגות</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{getAllItems('recommendations').length}</Text>
                <Text style={styles.kpiLabel}>המלצות</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subTitle}>🚨 חריגות מרכזיות</Text>
              {renderList(getAllItems('top_anomalies'), 'לא נמצאו חריגות מובנות')}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subTitle}>🔁 מנויים וחיובים חוזרים</Text>
              {renderList(getAllItems('subscriptions'), 'לא נמצאו מנויים מובנים')}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subTitle}>💸 הוצאות גדולות</Text>
              {renderList(getAllItems('large_expenses'), 'לא נמצאו הוצאות גדולות מובנות')}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subTitle}>✅ המלצות פעולה</Text>
              {renderList(getAllItems('recommendations'), 'לא נמצאו המלצות מובנות')}
            </View>

            <Text style={styles.sectionTitle}>ניתוח לפי חודש / מסמך</Text>

            {dashboards.map((item, index) => (
              <View key={`${item.filename}-${index}`} style={styles.monthCard}>
                <View>
                  <Text style={styles.monthName}>{item.month || 'לא זוהה'}</Text>
                  <Text style={styles.monthFileName}>{item.filename}</Text>
                </View>

                <View style={styles.monthStats}>
                  <View style={styles.monthPill}>
                    <Text style={styles.monthPillValue}>{item.financial_score || 0}</Text>
                    <Text style={styles.monthPillLabel}>ציון</Text>
                  </View>

                  <View style={styles.monthPill}>
                    <Text style={styles.monthPillValue}>{item.risk_level || 'unknown'}</Text>
                    <Text style={styles.monthPillLabel}>סיכון</Text>
                  </View>
                </View>
              </View>
            ))}

            {rawAnalysisText.length > 0 && (
              <TouchableOpacity
                style={styles.rawToggleButton}
                onPress={() => setShowRawAnalysis(!showRawAnalysis)}
              >
                <Text style={styles.rawToggleButtonText}>
                  {showRawAnalysis ? 'הסתר ניתוח טקסט מלא' : 'הצג ניתוח טקסט מלא'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.chatBox}>
          <Text style={styles.sectionTitle}>שיחה עם HomeMind</Text>

          <TextInput
            style={styles.input}
            placeholder="שאל שאלה על ההוצאות שלך..."
            value={message}
            onChangeText={setMessage}
            multiline
            textAlign="right"
          />

          <TouchableOpacity style={styles.sendButton} onPress={() => sendMessageToAI()}>
            <Text style={styles.sendButtonText}>שלח</Text>
          </TouchableOpacity>

          {aiAnswer.length > 0 && (
            <View style={styles.answerBox}>
              <Text style={styles.answerText}>{aiAnswer}</Text>
            </View>
          )}
        </View>

        {showRawAnalysis && rawAnalysisText.length > 0 && (
          <View style={styles.documentBox}>
            <Text style={styles.sectionTitle}>סיכום טקסט מלא</Text>
            <Text style={styles.documentText}>{rawAnalysisText}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },

  scroll: {
    paddingBottom: 120,
  },

  hero: {
    margin: 18,
    padding: 24,
    borderRadius: 34,
    backgroundColor: '#111827',
    minHeight: 300,
  },

  heroTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  avatarSmall: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  avatarSmallImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  greeting: {
    color: '#CBD5E1',
    fontSize: 18,
    textAlign: 'right',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right',
  },

  heroLabel: {
    marginTop: 34,
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'right',
  },

  heroAmount: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'right',
  },

  heroMetrics: {
    marginTop: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroMetric: {
    flex: 1,
    alignItems: 'center',
  },

  heroMetricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  heroMetricLabel: {
    color: '#CBD5E1',
    marginTop: 6,
    fontSize: 13,
  },

  heroDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  quickActions: {
    marginTop: -36,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },

  actionCard: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  actionIcon: {
    fontSize: 26,
  },

  actionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  statusBox: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    padding: 16,
  },

  statusText: {
    textAlign: 'right',
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '800',
  },

  filesBox: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 14,
  },

  fileName: {
    textAlign: 'right',
    fontSize: 15,
    color: '#334155',
    marginBottom: 8,
  },

  fileMore: {
    textAlign: 'right',
    color: '#64748B',
    fontWeight: '700',
  },

  mainGrid: {
    marginHorizontal: 18,
    marginTop: 22,
    gap: 16,
  },

  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardEyebrow: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    textTransform: 'uppercase',
  },

  bigScore: {
    fontSize: 58,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
    marginTop: 8,
  },

  scoreBar: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },

  scoreFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
  },

  cardText: {
    marginTop: 14,
    color: '#475569',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },

  aiHeadline: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
    color: '#0F172A',
  },

  dashboardBox: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    padding: 22,
  },

  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionLink: {
    color: '#6366F1',
    fontWeight: '900',
  },

  kpiRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 18,
  },

  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
  },

  kpiValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#4F46E5',
  },

  kpiLabel: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '800',
  },

  sectionCard: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  subTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
    color: '#0F172A',
    marginBottom: 12,
  },

  insightRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  insightDot: {
    color: '#6366F1',
    marginLeft: 8,
    fontSize: 10,
    marginTop: 7,
  },

  listItem: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    color: '#334155',
    textAlign: 'right',
  },

  emptyText: {
    color: '#64748B',
    textAlign: 'right',
    fontSize: 16,
  },

  monthCard: {
    marginTop: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  monthName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
    textAlign: 'right',
  },

  monthFileName: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
  },

  monthStats: {
    marginTop: 16,
    flexDirection: 'row-reverse',
    gap: 12,
  },

  monthPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },

  monthPillValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  monthPillLabel: {
    color: '#64748B',
    marginTop: 4,
  },

  rawToggleButton: {
    marginTop: 24,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },

  rawToggleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  chatBox: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
  },

  input: {
    minHeight: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    fontSize: 17,
    color: '#111827',
  },

  sendButton: {
    marginTop: 14,
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
  },

  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  answerBox: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 16,
  },

  answerText: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },

  documentBox: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 60,
  },

  documentText: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
  },
});